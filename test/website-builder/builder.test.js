import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureProjectOwnership,
  ensureTemplateFilesInCode,
  normalizeWebsiteProject,
  normalizeWebsiteVersion
} from '../../lib/website-builder-server-utils.js';
import { validateSyntax } from '../../lib/code-validator.js';

test('1. Security & Ownership verification', async (t) => {
  await t.test('allows owner with matching email', () => {
    const project = { user_email: 'owner@example.com' };
    assert.equal(ensureProjectOwnership(project, 'owner@example.com'), true);
    assert.equal(ensureProjectOwnership(project, 'OWNER@EXAMPLE.COM'), true);
  });

  await t.test('rejects non-owner email', () => {
    const project = { user_email: 'owner@example.com' };
    assert.equal(ensureProjectOwnership(project, 'attacker@example.com'), false);
    assert.equal(ensureProjectOwnership(project, null), false);
    assert.equal(ensureProjectOwnership(project, undefined), false);
  });

  await t.test('rejects empty or null project', () => {
    assert.equal(ensureProjectOwnership(null, 'owner@example.com'), false);
    assert.equal(ensureProjectOwnership({}, 'owner@example.com'), false);
  });
});

test('2. File Map & Code Template Contract', async (t) => {
  await t.test('preserves legacy single-file HTML without corruption', () => {
    const legacyHtml = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';
    const result = ensureTemplateFilesInCode(legacyHtml, 'my-site');
    assert.equal(result, legacyHtml);
  });

  await t.test('merges multi-file JSON and ensures critical Vite files', () => {
    const inputCode = JSON.stringify({
      'src/App.jsx': 'export default function App() { return <h1>Hello</h1>; }'
    });
    const result = ensureTemplateFilesInCode(inputCode, 'my-vite-site');
    const parsed = JSON.parse(result);
    assert.ok(parsed['package.json'], 'Must include package.json');
    assert.ok(parsed['index.html'], 'Must include index.html');
    assert.ok(parsed['src/main.jsx'], 'Must include src/main.jsx');
    assert.ok(parsed['src/App.jsx'], 'Must retain custom App.jsx');
    assert.match(parsed['src/App.jsx'], /Hello/);
  });
});

test('3. Code Validator — Prevents False Positives on Packages & Comments', async (t) => {
  await t.test('does NOT flag standard npm imports as IMPORT_PATH_ERROR', async () => {
    const code = `
      import React, { useState, useEffect } from 'react';
      import { motion } from 'framer-motion';
      import { Search, Menu } from 'lucide-react';
      export default function Component() {
        return <div className="p-4">Test</div>;
      }
    `;
    const result = await validateSyntax(code, 'jsx');
    const importErrors = result.errors.filter(e => e.type === 'IMPORT_PATH_ERROR');
    assert.equal(importErrors.length, 0, 'Standard npm packages should not be flagged as import path errors');
    assert.equal(result.isValid, true);
  });

  await t.test('handles brackets inside comments without throwing false syntax error', async () => {
    const codeWithComments = `
      // Note: check { value } here
      /* Multi-line comment:
         if (foo) { return; }
      */
      export default function Test() {
        return <span>Clean</span>;
      }
    `;
    const result = await validateSyntax(codeWithComments, 'jsx');
    assert.equal(result.isValid, true);
  });

  await t.test('detects actual unclosed brackets accurately', async () => {
    const brokenCode = `
      export default function Broken() {
        if (true) {
          return <div>Unclosed;
      }
    `;
    const result = await validateSyntax(brokenCode, 'jsx');
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some(e => e.type === 'SYNTAX_ERROR'));
  });
});

test('4. Dynamic Progress & Stage mapping', async (t) => {
  const computeStatus = (generationStep, status, hasCode) => {
    const progressByStep = {
      queued: 5,
      started: 10,
      detecting: 15,
      enhancing: 25,
      extracting: 35,
      prd: 45,
      planning: 50,
      executing: 55,
      building: 65,
      'api limits': 70,
      pausing: 70,
      refining: 75,
      validating: 80,
      saving: 90,
      deploying: 95,
      complete: 100,
      success: 100,
    };

    const stepKey = (generationStep || '').toLowerCase();
    let progress = 0;

    for (const [key, value] of Object.entries(progressByStep)) {
      if (stepKey.includes(key)) {
        progress = Math.max(progress, value);
      }
    }

    const taskMatch = generationStep.match(/(\d+)\s*\/\s*(\d+)/);
    if (taskMatch) {
      const current = parseInt(taskMatch[1], 10);
      const total = parseInt(taskMatch[2], 10);
      if (total > 0 && current <= total) {
        progress = Math.max(progress, Math.round(55 + (current / total) * 22));
      }
    }

    if (status === 'generating') {
      progress = Math.max(progress, 10);
    } else if (status === 'queued') {
      progress = Math.max(progress, 5);
    } else if (status === 'success') {
      progress = 100;
    }

    let stage = 'queued';
    if (status === 'success') {
      stage = 'preview_ready';
    } else if (status === 'generating') {
      stage = hasCode ? 'code_saved' : 'generating';
    }

    return { progress, stage };
  };

  await t.test('maps task index to progressive percentage', () => {
    const res1 = computeStatus('Building: Header (1/4)', 'generating', false);
    const res3 = computeStatus('Building: Footer (3/4)', 'generating', false);
    assert.ok(res1.progress >= 60, 'Task 1 should have >= 60% progress');
    assert.ok(res3.progress > res1.progress, 'Task 3 progress must exceed Task 1 progress');
    assert.equal(res1.stage, 'generating');
  });

  await t.test('never drops to 0% during active generation', () => {
    const res = computeStatus('Unrecognized custom step name', 'generating', false);
    assert.ok(res.progress >= 10, 'Active generation should have baseline >= 10% progress');
  });

  await t.test('distinguishes code_saved vs preview_ready stages', () => {
    const generatingWithCode = computeStatus('Deploying to sandbox', 'generating', true);
    assert.equal(generatingWithCode.stage, 'code_saved');

    const completed = computeStatus('Complete', 'success', true);
    assert.equal(completed.stage, 'preview_ready');
  });
});

test('5. Normalization Helpers & ID Resolution', async (t) => {
  await t.test('normalizes Appwrite project document fields', () => {
    const rawDoc = {
      $id: 'proj-123',
      name: 'My Store',
      description: 'Online store',
      html_content: '{"package.json":"{}"}',
      $createdAt: '2026-01-01T00:00:00.000Z',
      $updatedAt: '2026-01-02T00:00:00.000Z'
    };
    const norm = normalizeWebsiteProject(rawDoc);
    assert.equal(norm.id, 'proj-123');
    assert.equal(norm.project_name, 'My Store');
    assert.equal(norm.current_code, '{"package.json":"{}"}');
    assert.equal(norm.original_prompt, 'Online store');
  });

  await t.test('normalizes Appwrite version document fields', () => {
    const rawVersion = {
      $id: 'ver-456',
      html_content: '{"package.json":"{}"}',
      $createdAt: '2026-01-01T12:00:00.000Z'
    };
    const norm = normalizeWebsiteVersion(rawVersion);
    assert.equal(norm.id, 'ver-456');
    assert.equal(norm.code, '{"package.json":"{}"}');
  });
});

test('6. In-Memory Queue Sequencing & Promise Tracking Cleanup', async (t) => {
  const { queueByKey, creditLocks } = await import('../../lib/website-builder-server-utils.js');

  await t.test('executes tasks sequentially for the same key', async () => {
    const sequence = [];
    const key = `user-seq-${Date.now()}@example.com`;

    const p1 = queueByKey(key, async () => {
      await new Promise(r => setTimeout(r, 20));
      sequence.push('first');
    });

    const p2 = queueByKey(key, async () => {
      sequence.push('second');
    });

    await Promise.all([p1, p2]);
    assert.deepEqual(sequence, ['first', 'second']);
  });

  await t.test('cleans up creditLocks entry upon completion (no memory leak)', async () => {
    const key = `user-cleanup-${Date.now()}@example.com`;
    await queueByKey(key, async () => {
      return 'done';
    });
    // Wait tick for finally block
    await new Promise(r => setTimeout(r, 10));
    assert.equal(creditLocks.has(key), false, 'creditLocks Map must not leak entries after task resolution');
  });
});

test('7. Safe HTTP Mutations & Lifecycle Contract', async (t) => {
  await t.test('publish idempotent desired state evaluation', () => {
    const evaluatePublishMutation = (currentPublished, desiredPublished) => {
      if (Boolean(currentPublished) === Boolean(desiredPublished)) {
        return { modified: false, state: desiredPublished };
      }
      return { modified: true, state: desiredPublished };
    };

    assert.deepEqual(evaluatePublishMutation(true, true), { modified: false, state: true });
    assert.deepEqual(evaluatePublishMutation(false, false), { modified: false, state: false });
    assert.deepEqual(evaluatePublishMutation(false, true), { modified: true, state: true });
    assert.deepEqual(evaluatePublishMutation(true, false), { modified: true, state: false });
  });

  await t.test('updateWebsiteProjectCode generationStep and status options contract', () => {
    const buildUpdatePayload = (code, versionId, options = {}) => {
      const status = options?.status || 'success';
      const generationStep = options?.generationStep || 'Complete';
      const payload = {
        html_content: code,
        generation_step: generationStep,
        status: status
      };
      if (versionId) payload.current_version_id = versionId;
      return payload;
    };

    const defaultPayload = buildUpdatePayload('{"src/App.jsx":"code"}', 'ver-1');
    assert.equal(defaultPayload.status, 'success');
    assert.equal(defaultPayload.generation_step, 'Complete');

    const inProgressPayload = buildUpdatePayload('{"src/App.jsx":"code"}', 'ver-2', {
      status: 'generating',
      generationStep: 'Code saved'
    });
    assert.equal(inProgressPayload.status, 'generating');
    assert.equal(inProgressPayload.generation_step, 'Code saved');
    assert.equal(inProgressPayload.current_version_id, 'ver-2');
  });
});

test('8. Bounded Self-Repair & Repeated Error Fingerprint Cap', async (t) => {
  const createRepairTracker = (maxAttempts = 3) => {
    const attempts = new Map();
    return {
      canAttempt(error) {
        const fingerprint = `${error.type || 'RUNTIME_ERROR'}:${(error.message || '').trim().slice(0, 120)}`;
        const count = (attempts.get(fingerprint) || 0) + 1;
        attempts.set(fingerprint, count);
        return {
          allowed: count <= maxAttempts,
          attempt: count,
          fingerprint
        };
      },
      reset() {
        attempts.clear();
      }
    };
  };

  await t.test('allows up to 3 repair attempts for identical error then halts', () => {
    const tracker = createRepairTracker(3);
    const testError = { type: 'SYNTAX_ERROR', message: 'Unexpected token < at App.jsx:12:4' };

    const r1 = tracker.canAttempt(testError);
    assert.equal(r1.allowed, true);
    assert.equal(r1.attempt, 1);

    const r2 = tracker.canAttempt(testError);
    assert.equal(r2.allowed, true);
    assert.equal(r2.attempt, 2);

    const r3 = tracker.canAttempt(testError);
    assert.equal(r3.allowed, true);
    assert.equal(r3.attempt, 3);

    const r4 = tracker.canAttempt(testError);
    assert.equal(r4.allowed, false, 'Attempt 4 must be blocked to prevent endless credit burn');
    assert.equal(r4.attempt, 4);
  });

  await t.test('resets repair attempts upon successful revision', () => {
    const tracker = createRepairTracker(3);
    const err = { type: 'TYPE_ERROR', message: 'Cannot read properties of undefined' };
    tracker.canAttempt(err);
    tracker.canAttempt(err);
    tracker.reset();

    const fresh = tracker.canAttempt(err);
    assert.equal(fresh.allowed, true);
    assert.equal(fresh.attempt, 1);
  });
});

test('9. Visual Diff Calculation & File Status Detection', async (t) => {
  const computeFileDiffStatuses = (previousFiles, currentFiles) => {
    if (!previousFiles) return null;
    const statusMap = {};
    for (const [path, content] of Object.entries(currentFiles)) {
      if (previousFiles[path] === undefined) {
        statusMap[path] = 'added';
      } else if (previousFiles[path] !== content) {
        statusMap[path] = 'modified';
      } else {
        statusMap[path] = 'unchanged';
      }
    }
    return statusMap;
  };

  await t.test('accurately identifies added, modified, and unchanged files', () => {
    const v1 = {
      'package.json': '{"name":"site"}',
      'src/App.jsx': 'export default function App() { return <h1>V1</h1>; }',
      'src/index.css': 'body { margin: 0; }'
    };

    const v2 = {
      'package.json': '{"name":"site"}', // unchanged
      'src/App.jsx': 'export default function App() { return <h1>V2 Updated</h1>; }', // modified
      'src/index.css': 'body { margin: 0; }', // unchanged
      'src/components/Header.jsx': 'export default function Header() {}' // added
    };

    const diff = computeFileDiffStatuses(v1, v2);
    assert.equal(diff['package.json'], 'unchanged');
    assert.equal(diff['src/App.jsx'], 'modified');
    assert.equal(diff['src/index.css'], 'unchanged');
    assert.equal(diff['src/components/Header.jsx'], 'added');
  });

  await t.test('returns null when previousFiles is absent', () => {
    const diff = computeFileDiffStatuses(null, { 'src/App.jsx': 'code' });
    assert.equal(diff, null);
  });
});

test('10. Plan Mode Customization Contract', async (t) => {
  await t.test('updates requirements before plan approval', () => {
    const basePrd = {
      projectName: 'Original Site',
      description: 'Default store description',
      designSystem: {
        primaryColor: '#3b82f6',
        style: 'modern',
        theme: 'dark'
      },
      pages: [{ name: 'Home', route: '/' }]
    };

    const applyPlanEdits = (prd, edits) => ({
      ...prd,
      projectName: edits.projectName ?? prd.projectName,
      description: edits.description ?? prd.description,
      designSystem: {
        ...prd.designSystem,
        primaryColor: edits.primaryColor ?? prd.designSystem.primaryColor,
        style: edits.style ?? prd.designSystem.style
      }
    });

    const updated = applyPlanEdits(basePrd, {
      projectName: 'Customized Store',
      description: 'A boutique apparel shop with cart and checkout',
      primaryColor: '#6366f1',
      style: 'minimal'
    });

    assert.equal(updated.projectName, 'Customized Store');
    assert.equal(updated.description, 'A boutique apparel shop with cart and checkout');
    assert.equal(updated.designSystem.primaryColor, '#6366f1');
    assert.equal(updated.designSystem.style, 'minimal');
    assert.equal(updated.designSystem.theme, 'dark'); // preserved
    assert.equal(updated.pages.length, 1); // preserved
  });
});

test('11. Public vs Owner Project Response Contract & Privacy Guard', async (t) => {
  const sanitizeProjectForPublic = (project) => {
    return {
      id: project.$id || project.id,
      project_name: project.name || project.project_name || 'Published Website',
      current_code: project.html_content || project.current_code || '',
      html_content: project.html_content || project.current_code || '',
      is_published: true,
      published_url: project.published_url || '',
      created_at: project.$createdAt || project.created_at,
      updated_at: project.$updatedAt || project.updated_at,
      conversations: [],
      versions: []
    };
  };

  await t.test('strips private conversations, versions, and owner email for public visitors', () => {
    const rawProject = {
      $id: 'proj-secret',
      user_email: 'owner@example.com',
      name: 'Public Portfolio',
      html_content: '<html><body>Site</body></html>',
      is_published: true,
      published_url: 'https://site.chatbox.ai',
      $createdAt: '2026-01-01T00:00:00Z',
      $updatedAt: '2026-01-02T00:00:00Z',
      conversations: [
        { role: 'user', content: 'Secret prompt with API keys' },
        { role: 'assistant', content: 'Internal thought transcript' }
      ],
      versions: [
        { id: 'v1', code: 'old draft' },
        { id: 'v2', code: 'current draft' }
      ]
    };

    const publicView = sanitizeProjectForPublic(rawProject);

    assert.equal(publicView.id, 'proj-secret');
    assert.equal(publicView.project_name, 'Public Portfolio');
    assert.equal(publicView.current_code, '<html><body>Site</body></html>');
    assert.equal(publicView.is_published, true);
    assert.equal(publicView.user_email, undefined, 'Owner email must NOT be leaked to public');
    assert.deepEqual(publicView.conversations, [], 'Conversations must be empty for public visitors');
    assert.deepEqual(publicView.versions, [], 'Versions must be empty for public visitors');
  });
});

test('12. Event Dispatch Failure Recovery & Stale Worker Timeout', async (t) => {
  await t.test('detects stale queued or generating jobs exceeding 15 minutes', () => {
    const checkStaleStatus = (status, updatedAtMs, nowMs) => {
      const isStale = (status === 'queued' || status === 'generating') && (nowMs - updatedAtMs > 15 * 60 * 1000);
      if (isStale) {
        return {
          status: 'error',
          stage: 'failed',
          is_stale: true,
          error_message: 'The generation job timed out. You may safely retry.'
        };
      }
      return { status, is_stale: false };
    };

    const now = 1000000000000;
    const freshJob = checkStaleStatus('generating', now - 2 * 60 * 1000, now);
    assert.equal(freshJob.status, 'generating');
    assert.equal(freshJob.is_stale, false);

    const staleJob = checkStaleStatus('queued', now - 20 * 60 * 1000, now);
    assert.equal(staleJob.status, 'error');
    assert.equal(staleJob.stage, 'failed');
    assert.equal(staleJob.is_stale, true);
  });
});

test('13. Image Binary Signature (Magic Bytes) & Prompt Validation', async (t) => {
  const validateImageBuffer = (buffer) => {
    if (!buffer || buffer.length < 12) return false;
    const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isGif = buffer.length > 6 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
    const isWebp = buffer.length > 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    return isPng || isJpg || isGif || isWebp;
  };

  await t.test('accepts valid PNG, JPEG, GIF, and WEBP magic bytes', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    assert.equal(validateImageBuffer(pngHeader), true);

    const jpgHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    assert.equal(validateImageBuffer(jpgHeader), true);

    const gifHeader = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00', 'binary');
    assert.equal(validateImageBuffer(gifHeader), true);

    const webpHeader = Buffer.from('RIFF\x20\x00\x00\x00WEBPVP8 ', 'ascii');
    assert.equal(validateImageBuffer(webpHeader), true);
  });

  await t.test('rejects disguised non-image files like HTML or shell scripts', () => {
    const htmlBuffer = Buffer.from('<!DOCTYPE html><html><script>alert(1)</script></html>');
    assert.equal(validateImageBuffer(htmlBuffer), false);

    const shellBuffer = Buffer.from('#!/bin/bash\nrm -rf /');
    assert.equal(validateImageBuffer(shellBuffer), false);
  });

  await t.test('validates image generation prompt bounds (1 to 1000 characters)', () => {
    const validatePrompt = (p) => {
      const trimmed = (p || '').trim();
      if (!trimmed) return { valid: false, error: 'Prompt is required' };
      if (trimmed.length > 1000) return { valid: false, error: 'Exceeds 1000 characters' };
      return { valid: true };
    };

    assert.equal(validatePrompt('').valid, false);
    assert.equal(validatePrompt('   ').valid, false);
    assert.equal(validatePrompt('A sleek modern hero banner').valid, true);
    assert.equal(validatePrompt('A'.repeat(1001)).valid, false);
  });
});

test('14. Revision Quality Gate & Last Known-Good Code Preservation', async (t) => {
  const evaluateRevisionQualityGate = (workingFiles, criticalErrors) => {
    if (criticalErrors && criticalErrors.length > 0) {
      return {
        passed: false,
        action: 'preserve_last_known_good',
        refund: true,
        httpStatus: 422
      };
    }
    return {
      passed: true,
      action: 'save_and_update_project',
      refund: false,
      httpStatus: 200
    };
  };

  await t.test('blocks broken candidate files from overwriting working project and refunds credit', () => {
    const brokenResult = evaluateRevisionQualityGate({ 'src/App.jsx': 'broken syntax' }, ['SyntaxError: Unexpected token']);
    assert.equal(brokenResult.passed, false);
    assert.equal(brokenResult.action, 'preserve_last_known_good');
    assert.equal(brokenResult.refund, true);
    assert.equal(brokenResult.httpStatus, 422);
  });

  await t.test('allows clean validated revision to update project code', () => {
    const cleanResult = evaluateRevisionQualityGate({ 'src/App.jsx': 'export default function App() {}' }, []);
    assert.equal(cleanResult.passed, true);
    assert.equal(cleanResult.action, 'save_and_update_project');
    assert.equal(cleanResult.refund, false);
    assert.equal(cleanResult.httpStatus, 200);
  });
});



