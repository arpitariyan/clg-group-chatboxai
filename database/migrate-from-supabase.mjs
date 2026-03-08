// database/migrate-from-supabase.mjs
// Run with: node database/migrate-from-supabase.mjs
// Make sure your .env (in the project root) has real Appwrite credentials first.
// Place all Supabase CSV exports in: database/csv-exports/

import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { Client, Databases, ID } from 'node-appwrite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_DIR = path.join(__dirname, 'csv-exports');

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);
const DB_ID = process.env.APPWRITE_DATABASE_ID;
const DRY_RUN = process.argv.includes('--dry-run');

// Appwrite system fields that must not be inserted as document data.
// NOTE: 'created_at' is intentionally NOT stripped — it is defined as a
// custom String attribute on collections so original Supabase timestamps are preserved.
const STRIP_FIELDS = new Set([
  'id', '$id', '$createdAt', '$updatedAt', '$permissions',
  '$collectionId', '$databaseId',
  'updated_at',
]);

// Fields that should be coerced to integer
const INT_FIELDS = new Set([
  'credits', 'width', 'height', 'version_number', 'sort_order',
  'weekly_credits', 'purchased_credits', 'credits_consumed',
  'credits_remaining', 'amount', 'price', 'analyzedFilesCount',
]);

// Fields that should be coerced to float
const FLOAT_FIELDS = new Set(['amount']);

// Supabase stores some logical booleans as varchar in legacy tables (e.g. Chats).
// Keep these values as strings to match Appwrite attribute types.
const STRING_BOOLEAN_FIELDS = new Set(['liked', 'disliked']);

// Per-field string length guardrails to match Appwrite attribute sizes.
const STRING_FIELD_LIMITS = new Map([
  ['searchInput', 1000000],
  ['userSearchInput', 5000],
  ['searchResult', 1000000],
  ['aiResp', 1000000],
  ['processedFiles', 1000000],
  ['uploadedFiles', 1000000],
  ['analysisType', 50],
  ['liked', 20],
  ['disliked', 20],
  ['html_content', 1000000],
  ['content', 1000000],
]);

const COLLECTIONS = [
  {
    key: 'users',
    fileCandidates: ['Users.csv', 'Users_rows.csv', 'Users_rows (1).csv'],
    collectionId: process.env.APPWRITE_USERS_COLLECTION_ID,
    allowedFields: [
      'created_at', 'email', 'name', 'plan', 'credits', 'last_monthly_reset',
      'mfa_enabled', 'mfa_email', 'accent_color', 'language', 'subscription_id',
      'subscription_start_date', 'subscription_end_date', 'subscription_status',
      'is_blocked', 'last_login', 'is_manual_assignment', 'team_id', 'is_team_member',
    ],
    requiredFields: ['email'],
  },
  {
    key: 'library',
    fileCandidates: ['Library.csv', 'Library_rows.csv'],
    collectionId: process.env.APPWRITE_LIBRARY_COLLECTION_ID,
    allowedFields: [
      'created_at', 'libId', 'searchInput', 'userEmail', 'type', 'selectedModel',
      'modelName', 'hasFiles', 'uploadedFiles', 'analyzedFilesCount', 'processedAt',
    ],
    requiredFields: ['libId'],
  },
  {
    key: 'chats',
    fileCandidates: ['Chats.csv', 'Chats_rows.csv'],
    collectionId: process.env.APPWRITE_CHATS_COLLECTION_ID,
    allowedFields: [
      'created_at', 'libId', 'userSearchInput', 'searchResult', 'aiResp', 'liked',
      'disliked', 'usedModel', 'modelApi', 'analysisType', 'analyzedFilesCount', 'processedFiles',
    ],
    requiredFields: ['libId'],
  },
  {
    key: 'image_generation',
    fileCandidates: ['ImageGeneration.csv', 'ImageGeneration_rows.csv'],
    collectionId: process.env.APPWRITE_IMAGE_GENERATION_COLLECTION_ID,
    allowedFields: ['created_at', 'libId', 'userEmail', 'prompt', 'generatedImagePath', 'publicUrl', 'status', 'model', 'width', 'height'],
  },
  {
    key: 'bug_reports',
    fileCandidates: ['bug_reports.csv', 'bug_reports_rows.csv'],
    collectionId: process.env.APPWRITE_BUG_REPORTS_COLLECTION_ID,
    allowedFields: ['created_at', 'user_email', 'title', 'description', 'status'],
  },
  {
    key: 'subscriptions',
    fileCandidates: ['subscriptions.csv', 'subscriptions_rows.csv'],
    collectionId: process.env.APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
    allowedFields: ['created_at', 'user_email', 'plan', 'status', 'amount', 'payment_id', 'order_id', 'start_date', 'end_date'],
    fieldMap: {
      razorpay_subscription_id: 'payment_id',
      razorpay_order_id: 'order_id',
      plan_type: 'plan',
    },
  },
  {
    key: 'usage_logs',
    fileCandidates: ['usage_logs.csv', 'usage_logs_rows.csv'],
    collectionId: process.env.APPWRITE_USAGE_LOGS_COLLECTION_ID,
    allowedFields: ['created_at', 'user_id', 'model', 'operation_type', 'credits_consumed', 'credits_remaining'],
  },
  {
    key: 'mfa_otps',
    fileCandidates: ['mfa_otps.csv', 'mfa_otps_rows.csv'],
    collectionId: process.env.APPWRITE_MFA_OTPS_COLLECTION_ID,
    allowedFields: ['created_at', 'user_email', 'mfa_email', 'otp', 'used', 'expires_at'],
  },
  {
    key: 'user_seen_updates',
    fileCandidates: ['user_seen_updates.csv', 'user_seen_updates_rows.csv'],
    collectionId: process.env.APPWRITE_USER_SEEN_UPDATES_COLLECTION_ID,
    allowedFields: ['created_at', 'user_email', 'update_id', 'seen_at'],
  },
  {
    key: 'user_subscription_status',
    fileCandidates: ['user_subscription_status.csv', 'user_subscription_status_rows.csv'],
    collectionId: process.env.APPWRITE_USER_SUBSCRIPTION_STATUS_COLLECTION_ID,
    allowedFields: ['created_at', 'user_email', 'status', 'plan'],
  },
  {
    key: 'website_conversations',
    fileCandidates: ['website_conversations.csv', 'website_conversations_rows.csv'],
    collectionId: process.env.APPWRITE_WEBSITE_CONVERSATIONS_COLLECTION_ID,
    allowedFields: ['created_at', 'project_id', 'role', 'content'],
    requiredFields: ['project_id'],
  },
  {
    key: 'website_credit_packages',
    fileCandidates: ['website_credit_packages.csv', 'website_credit_packages_rows.csv'],
    collectionId: process.env.APPWRITE_WEBSITE_CREDIT_PACKAGES_COLLECTION_ID,
    allowedFields: ['created_at', 'name', 'credits', 'price', 'currency', 'description', 'is_active', 'sort_order'],
    fieldMap: {
      display_name: 'name',
      price_inr: 'price',
    },
    defaults: {
      currency: 'INR',
    },
  },
  {
    key: 'website_credit_transactions',
    fileCandidates: ['website_credit_transactions.csv', 'website_credit_transactions_rows.csv'],
    collectionId: process.env.APPWRITE_WEBSITE_CREDIT_TRANSACTIONS_COLLECTION_ID,
    allowedFields: ['created_at', 'user_email', 'amount', 'transaction_type', 'order_id', 'package_id'],
  },
  {
    key: 'website_images',
    fileCandidates: ['website_images.csv', 'website_images_rows.csv'],
    collectionId: process.env.APPWRITE_WEBSITE_IMAGES_COLLECTION_ID,
    allowedFields: ['created_at', 'project_id', 'user_email', 'prompt', 'image_url', 'file_id'],
  },
  {
    key: 'website_projects',
    fileCandidates: ['website_projects.csv', 'website_projects_rows.csv'],
    collectionId: process.env.APPWRITE_WEBSITE_PROJECTS_COLLECTION_ID,
    allowedFields: ['created_at', 'user_email', 'name', 'description', 'html_content', 'is_published', 'published_url', 'current_version_id'],
    fieldMap: {
      project_name: 'name',
      current_code: 'html_content',
    },
    transformRow: (row) => {
      if (!row.description) {
        row.description = row.enhanced_prompt || row.original_prompt || '';
      }
      return row;
    },
  },
  {
    key: 'website_user_credits',
    fileCandidates: ['website_user_credits.csv', 'website_user_credits_rows.csv'],
    collectionId: process.env.APPWRITE_WEBSITE_USER_CREDITS_COLLECTION_ID,
    allowedFields: ['created_at', 'user_email', 'weekly_credits', 'purchased_credits', 'week_start_date', 'is_pro'],
    requiredFields: ['user_email'],
  },
  {
    key: 'website_versions',
    fileCandidates: ['website_versions.csv', 'website_versions_rows.csv'],
    collectionId: process.env.APPWRITE_WEBSITE_VERSIONS_COLLECTION_ID,
    allowedFields: ['created_at', 'project_id', 'html_content', 'version_number', 'description'],
    fieldMap: {
      code: 'html_content',
    },
    defaults: {
      version_number: 1,
    },
    requiredFields: ['project_id'],
  },
];

// Header aliases from Supabase/CSV variants → canonical keys
const HEADER_ALIASES = new Map([
  ['libid', 'libId'],
  ['lib_id', 'libId'],
  ['usersearchinput', 'userSearchInput'],
  ['searchresult', 'searchResult'],
  ['usedmodel', 'usedModel'],
  ['modelapi', 'modelApi'],
  ['analyzedfilescount', 'analyzedFilesCount'],
  ['processedfiles', 'processedFiles'],
]);

function normalizeHeaderName(header) {
  let key = String(header ?? '').replace(/^\uFEFF/, '').trim();
  key = key.replace(/^"(.+)"$/, '$1').trim();

  const normalized = key.replace(/\s+/g, '');
  const alias = HEADER_ALIASES.get(normalized.toLowerCase());
  return alias || key;
}

function cleanRow(row) {
  const out = {};

  for (const [key, raw] of Object.entries(row)) {
    if (STRIP_FIELDS.has(key)) continue;
    if (raw === '' || raw === null || raw === undefined) continue;

    if (!STRING_BOOLEAN_FIELDS.has(key)) {
      if (raw === 'true')  { out[key] = true;  continue; }
      if (raw === 'false') { out[key] = false; continue; }
    }

    if (INT_FIELDS.has(key) && !FLOAT_FIELDS.has(key)) {
      const n = parseInt(raw, 10);
      if (!isNaN(n)) { out[key] = n; continue; }
    }

    if (FLOAT_FIELDS.has(key)) {
      const n = parseFloat(raw);
      if (!isNaN(n)) { out[key] = n; continue; }
    }

    let value = typeof raw === 'string' ? raw : String(raw);
    const limit = STRING_FIELD_LIMITS.get(key);
    if (typeof limit === 'number' && value.length > limit) {
      value = value.slice(0, limit);
    }

    out[key] = value;
  }

  return out;
}

function resolveCsvPath(fileCandidates) {
  for (const candidate of fileCandidates || []) {
    const fullPath = path.join(CSV_DIR, candidate);
    if (existsSync(fullPath)) return { fullPath, fileName: candidate };
  }
  return null;
}

function shapeRowForCollection(rawRow, config) {
  const mapped = {};

  for (const [key, value] of Object.entries(rawRow)) {
    const fieldMap = config.fieldMap || {};
    const mappedKey = fieldMap[key] || key;
    mapped[mappedKey] = value;
  }

  if (typeof config.transformRow === 'function') {
    config.transformRow(mapped);
  }

  if (config.defaults) {
    for (const [key, value] of Object.entries(config.defaults)) {
      if (mapped[key] === undefined || mapped[key] === null || mapped[key] === '') {
        mapped[key] = value;
      }
    }
  }

  if (Array.isArray(config.allowedFields) && config.allowedFields.length > 0) {
    const filtered = {};
    for (const key of config.allowedFields) {
      if (mapped[key] !== undefined) filtered[key] = mapped[key];
    }
    return filtered;
  }

  return mapped;
}

function validateRequiredFields(row, requiredFields = []) {
  for (const field of requiredFields) {
    if (row[field] === undefined || row[field] === null || row[field] === '') {
      return field;
    }
  }
  return null;
}

async function importCollection(config) {
  const { collectionId, key } = config;

  if (!collectionId) {
    console.log(`  ⚠  Skipping ${key} — collection ID env var not set`);
    return;
  }

  const resolved = resolveCsvPath(config.fileCandidates);
  if (!resolved) {
    console.log(`  ⚠  Skipping ${key} — CSV file not found (${(config.fileCandidates || []).join(', ')})`);
    return;
  }

  const { fullPath, fileName } = resolved;

  const csv = readFileSync(fullPath, 'utf-8');
  let rows;
  try {
    rows = parse(csv, {
      bom: true,
      columns: (headers) => headers.map(normalizeHeaderName),
      skip_empty_lines: true,
      trim: true,
    });
  } catch (parseErr) {
    console.error(`  ✗  Failed to parse ${fileName}:`, parseErr.message);
    return;
  }

  console.log(`\n→ ${fileName}  (${rows.length} rows)  →  [${collectionId}]`);

  let success = 0;
  let failed = 0;

  for (const rawRow of rows) {
    const shaped = shapeRowForCollection(rawRow, config);
    const missing = validateRequiredFields(shaped, config.requiredFields);

    if (missing) {
      failed++;
      console.error(`   ✗ Row failed: missing required field '${missing}'`);
      continue;
    }

    const data = cleanRow(shaped);

    if (DRY_RUN) {
      success++;
      if (success % 200 === 0) {
        console.log(`   ${success} / ${rows.length} validated...`);
      }
      continue;
    }

    try {
      await db.createDocument(DB_ID, collectionId, ID.unique(), data);
      success++;
      if (success % 50 === 0) {
        console.log(`   ${success} / ${rows.length} imported...`);
      }
    } catch (err) {
      failed++;
      const preview = JSON.stringify(data).substring(0, 180);
      console.error(`   ✗ Row failed: ${preview}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  const status = failed === 0 ? '✅' : '⚠';
  console.log(`   ${status}  ${success} imported, ${failed} failed`);
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Supabase → Appwrite ${DRY_RUN ? 'Validation (Dry Run)' : 'Data Migration'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Endpoint : ${process.env.APPWRITE_ENDPOINT}`);
  console.log(`  Project  : ${process.env.APPWRITE_PROJECT_ID}`);
  console.log(`  Database : ${DB_ID}`);
  console.log(`  CSV dir  : ${CSV_DIR}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY || !DB_ID) {
    console.error('ERROR: APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and APPWRITE_DATABASE_ID must be set in .env');
    process.exit(1);
  }

  for (const config of COLLECTIONS) {
    await importCollection(config);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Migration complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
