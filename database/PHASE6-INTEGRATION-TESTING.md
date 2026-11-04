# Phase 6: Integration & Testing Guide

## Pre-Integration Checklist

### Environment Variables
Ensure your `.env.local` includes:

```bash
# Existing
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=database
APPWRITE_WEBSITE_PROJECTS_COLLECTION_ID=website_projects
NEXT_PUBLIC_OPENAI_API_KEY=

# New for e2b
E2B_API_KEY=your_e2b_api_key

# Inngest (should already exist)
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

### Database Schema Migration

**Step 1: Run the migration script**
```bash
node database/async-generation-migration.mjs
```

This adds 5 new fields to `website_projects`:
- `status` (string): 'queued', 'generating', 'success', 'error'
- `generation_step` (string): Current pipeline step
- `sandbox_id` (string): e2b sandbox identifier
- `sandbox_url` (string): Exposed sandbox preview URL
- `designSpec` (string/JSON): Extracted design specifications

**Step 2: Verify fields exist**
```bash
# Use Appwrite Console to check website_projects collection
# Should see 5 new fields in addition to existing ones
```

---

## Testing Workflow

### Test 1: Basic Async Generation (No Design)

**Setup:**
1. Start your dev server: `npm run dev`
2. Navigate to website builder: `/website-builder/[projectId]`
3. Click "Generate" button (no design upload)

**Expected Flow:**
1. ✅ HTTP 202 response returned immediately (non-blocking)
2. ✅ GenerationProgress component appears (bottom-right corner)
3. ✅ Status updates every 2 seconds from `/api/website-builder/status`
4. ✅ Progress bar advances through:
   - Queued (5%) → Detecting (10%) → Enhancing (20%) → PRD (30%) → Tasks (40%) → Building (70%) → Validating (85%) → Saving (95%) → Success (100%)
5. ✅ Sidebar shows real-time messages:
   - "🎯 Website Type Detected: [type]"
   - "🔍 Analyzed and refined your requirements..."
   - "📋 Creating Product Requirements Document..."
   - etc.
6. ✅ On success: Code appears in preview, GenerationProgress auto-dismisses

**Common Issues:**
- **Progress not updating**: Check `/api/website-builder/status` endpoint
- **Generation stuck**: Check Inngest dashboard for failed jobs
- **No sidebar messages**: Check webhook URL in Inngest config

### Test 2: Design-Aware Generation

**Setup:**
1. Navigate to website builder
2. Click new "Design" button (purple, with image icon) in navbar
3. Upload a design screenshot (Figma export, Sketch, etc.)
4. Add optional design style description: "Dark glassmorphism with cyan accents"
5. Click "Generate with Design"

**Expected Flow:**
1. ✅ DesignUploadModal opens with image preview
2. ✅ HTTP 202 response with `imageUrl` in request body
3. ✅ Step 3 "extract-design-spec" runs:
   - "🎨 Analyzing design screenshot..."
   - GPT-4o Vision extracts: colors, layout, typography, components
   - "✅ Design specifications extracted"
4. ✅ Step 4 (PRD generation) injects design constraints:
   - AI PRD respects colors from screenshot
   - Layout/spacing matches design intent
5. ✅ Final code matches design screenshot

**Common Issues:**
- **Image upload fails**: Check file size (<10MB) and format (PNG/JPG)
- **Design extraction times out**: OpenAI Vision taking too long, check API credits
- **Code doesn't match design**: Design constraints not injected into prompt, check inngest/functions.js Step 4

### Test 3: Sandbox Deployment (e2b)

**Setup:**
1. Complete generation from Test 1 or 2
2. Wait for status to reach "Deploying" step

**Expected Flow:**
1. ✅ Step 8 "deploy-to-e2b" executes:
   - "🚀 Preparing sandbox environment..."
   - New sandbox created or existing reused
   - "✅ Sandbox created: [sandbox_id]"
   - "📝 Writing X files to sandbox..."
2. ✅ Files written to `/home/user/project` in sandbox
3. ✅ Vite dev server starts: `npm install` + `npm run dev`
4. ✅ Sandbox URL generated and saved to project
5. ✅ BuilderPreview iframe loads sandbox URL

**Expected Result:**
- Preview shows live Vite dev server (NOT inline code)
- URL in browser console shows: `http://localhost:5173` (dev) or `https://[sandbox-id].e2b.dev:5173` (production)
- Hot reload works: Edit file → save → preview updates instantly

**Common Issues:**
- **Sandbox timeout**: Increase timeout in e2b-sandbox.js ~`executeSandboxCommand()`
- **Port 5173 in use**: Kill existing process or use different port
- **npm install fails**: Missing dependencies in package.json, check vite-e2b-template.js
- **Dev server doesn't start**: Check sandbox logs, e2b has detailed error output

### Test 4: Error Handling & Recovery

**Setup 1: Simulate Generation Error**
1. Modify inngest/functions.js to throw error in Step 5 (for testing)
2. Trigger generation
3. Observe error handling

**Expected:**
- ✅ GenerationProgress shows error status
- ✅ Error message displayed in component
- ✅ Generation stops, polling ceases
- ✅ Sidebar shows error message
- ✅ User can retry by clicking Generate again

**Setup 2: Sandbox Failure Graceful Fallback**
1. Mock e2b API failure in e2b-sandbox.js
2. Trigger generation

**Expected:**
- ✅ Sandbox deployment attempts, fails gracefully
- ✅ Message: "⚠️ Sandbox deployment issue (using fallback)"
- ✅ Code still saved to Appwrite (fallback)
- ✅ Preview shows inline code instead of sandbox
- ✅ Generation marks as success overall

### Test 5: Polling Edge Cases

**Setup 1: Very Fast Completion**
1. Trigger generation with simple prompt
2. Check if polling captures all status updates

**Expected:**
- ✅ All status updates captured (no skipped steps)
- ✅ Progress bar smooth (no jumps from 30% to 85%)

**Setup 2: Very Slow Generation**
1. Manually set slow timeouts in inngest/functions.js
2. Monitor polling

**Expected:**
- ✅ Status updates continue streaming
- ✅ Elapsed time displays correctly
- ✅ Polling recovers from network glitches (2-3 second retry)

---

## Performance Benchmarks

| Metric | Target | Actual |
|--------|--------|--------|
| HTTP response time (POST /generate) | <100ms | ? |
| First status poll | <2.5s | ? |
| Status poll interval | 2s | ? |
| Full generation time | 5-10 min | ? |
| e2b sandbox boot | <30s | ? |
| Design extraction (GPT-4o Vision) | <10s | ? |

---

## Integration Checklist

- [ ] E2B_API_KEY set and valid
- [ ] OpenAI API key has vision model access
- [ ] Inngest webhooks configured
- [ ] Appwrite collections created and migrated
- [ ] `/api/website-builder/generate` accepts `imageUrl` parameter
- [ ] `/api/website-builder/status` returns correct progress fields
- [ ] GenerationProgress component displays properly
- [ ] DesignUploadModal functional
- [ ] BuilderNavbar has Design button
- [ ] page.jsx polling loop active
- [ ] Sandbox URL appears in project after generation
- [ ] Preview iframe loads sandbox URL (not inline code)

---

## Debugging Tools

### Inngest Dashboard
```
https://app.inngest.com/
- Monitor websiteGenerateFunction execution
- View step-by-step logs
- Retry failed jobs
```

### e2b Dashboard
```
https://e2b.dev/dashboard/
- View active sandboxes
- Check resource usage
- Monitor dev server logs
```

### Browser DevTools
**Console:**
- `fetch('/api/website-builder/status?projectId=X&userEmail=Y')` - Manual status poll
- `localStorage.setItem('debug', '*')` - Enable debug logs

**Network Tab:**
- Monitor status polling requests (every 2s)
- Should see 202 from POST /generate
- Should see 200 from repeated GET /status

### Appwrite Console
- Check website_projects collection
- Verify new fields (status, sandbox_id, designSpec)
- Inspect project document for correct values

---

## Rollback Plan

If issues arise, rollback steps:

1. **Revert to sync generation:**
   - Comment out `startGenerationPolling()` in page.jsx
   - Restore old blocking `await fetch('/generate')`
   - Works immediately (but slower)

2. **Disable sandbox fallback:**
   - Set `FAIL_FAST` mode in e2b-sandbox.js
   - Code generation continues without preview
   - Users still get generated code, just no live preview

3. **Disable design extraction:**
   - Comment out Step 3 in inngest/functions.js
   - Generation skips design analysis
   - Works with text-only prompts (fallback to existing)

---

## Post-Implementation Monitoring

### Metrics to Track
1. **Generation success rate**: (success / total) %
2. **Average generation time**: seconds
3. **Sandbox creation success**: %
4. **Design extraction accuracy**: % (manual review)
5. **Error recovery rate**: % (retries that succeed)

### Error Logging
All errors logged to `website_error_logs` collection:
- Timestamp
- Error type
- Error message
- Project ID
- Step where error occurred

### User Feedback
- Collect feedback on generation speed (should be same)
- Collect feedback on async UX (should feel better with live progress)
- Collect feedback on sandbox preview (should feel faster/more stable)

---

## Next Steps After Integration

1. **Monitor production for 1 week**
   - Check error rates
   - Monitor performance metrics
   - Gather user feedback

2. **Optimize based on data**
   - Slow polls? Reduce poll interval
   - Slow generation? Optimize prompt injection
   - Slow sandbox? Increase e2b resource allocation

3. **Add missing features**
   - Design version history
   - Sandbox restart/reset button
   - Design template library

4. **Scale considerations**
   - Sandbox cleanup for abandoned projects
   - Credit consumption by async jobs
   - Queue management for concurrent generations
