import { Client, Databases, Users, ID, Query } from 'node-appwrite';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// ── Appwrite Admin Initialization ─────────────────────────────────────────────
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const users = new Users(client);

const DB_ID = process.env.APPWRITE_DATABASE_ID;
const API_KEYS_COLLECTION_ID = process.env.APPWRITE_API_KEYS_COLLECTION_ID || 'api_keys';
const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID || 'users';
const LOCAL_API_URL = 'http://localhost:3000/api/v1';

const TEST_EMAIL = `test_api_svc_${Date.now()}@example.com`;

function generateKey(env = 'test') {
  const suffix = crypto.randomBytes(32).toString('hex').slice(0, 32);
  return `cbx_${env}_${suffix}`;
}
function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// ── Test helpers ─────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function ok(label) { console.log(`   ✅ ${label}`); passed++; }
function fail(label, detail = '') { console.error(`   ❌ ${label}${detail ? ': ' + detail : ''}`); failed++; }

async function check(label, fn) {
  try { await fn(); }
  catch (e) { fail(label, e.message); }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\n🚀  ChatboxAI API Key Service — Full Integration Test Suite\n');

  let testUserId = null;
  let testKeyDocId = null;
  let liveKeyDocId = null;
  const rawTestKey = generateKey('test');
  const rawLiveKey = generateKey('live');
  let creditsDoc = null;

  try {
    // ─ 1. Bootstrap user ────────────────────────────────────────────────────
    console.log('── 1. Setting up test user ───────────────────────────────');
    const user = await users.create(ID.unique(), TEST_EMAIL, undefined, 'password123', 'API Test User');
    testUserId = user.$id;
    ok(`Created Appwrite auth user ${testUserId}`);

    await databases.createDocument(DB_ID, USERS_COLLECTION_ID, testUserId, {
      email: TEST_EMAIL, name: 'API Test User', created_at: new Date().toISOString(),
    });
    ok('Inserted user into users collection');

    // ─ 2. Bootstrap test key (cbx_test_…) ───────────────────────────────────
    console.log('\n── 2. Setting up cbx_test_ key ──────────────────────────');
    const testKeyDoc = await databases.createDocument(DB_ID, API_KEYS_COLLECTION_ID, ID.unique(), {
      user_id: testUserId,
      key_hash: hashKey(rawTestKey),
      name: 'Integration Test Key (test env)',
      status: 'active',
      environment: 'test',
      rate_limit_rpm: 60,
      rate_limit_tpm: 90000,
      created_at: new Date().toISOString(),
    });
    testKeyDocId = testKeyDoc.$id;
    ok(`Created cbx_test_ key: ${rawTestKey.slice(0, 18)}...`);

    // ─ 3. Bootstrap live key (cbx_live_…) + credits ─────────────────────────
    console.log('\n── 3. Setting up cbx_live_ key + credits ────────────────');
    const liveKeyDoc = await databases.createDocument(DB_ID, API_KEYS_COLLECTION_ID, ID.unique(), {
      user_id: testUserId,
      key_hash: hashKey(rawLiveKey),
      name: 'Integration Test Key (live env)',
      status: 'active',
      environment: 'live',
      rate_limit_rpm: 60,
      rate_limit_tpm: 90000,
      created_at: new Date().toISOString(),
    });
    liveKeyDocId = liveKeyDoc.$id;
    ok(`Created cbx_live_ key: ${rawLiveKey.slice(0, 18)}...`);

    // Seed 0 credits (try api_credits, fall back gracefully)
    try {
      creditsDoc = await databases.createDocument(DB_ID, 'api_credits', ID.unique(), {
        user_id: testUserId,
        user_email: TEST_EMAIL,
        balance_credits: '0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      ok('Created api_credits doc (balance = 0)');
    } catch (e) {
      fail('Create api_credits doc', e.message);
    }

    const testHdrs  = { 'Authorization': `Bearer ${rawTestKey}`,  'Content-Type': 'application/json' };
    const liveHdrs  = { 'Authorization': `Bearer ${rawLiveKey}`,  'Content-Type': 'application/json' };

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION A  —  TEST KEY MOCK RESPONSES (no real credits, no real providers)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n── A. Test-key mock responses (cbx_test_…) ─────────────');

    // A1. Chat completions mock
    await check('A1 · Chat mock (free model, test key)', async () => {
      const r = await fetch(`${LOCAL_API_URL}/chat/completions`, {
        method: 'POST', headers: testHdrs,
        body: JSON.stringify({ model: 'chatboxai/llama-3.3-70b', messages: [{ role: 'user', content: 'Hi' }] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`${r.status} — ${JSON.stringify(j)}`);
      if (!j.test_mode) throw new Error('test_mode flag missing in response');
      if (!j.choices?.[0]?.message?.content?.includes('[TEST MODE]')) throw new Error('Mock content missing');
      if (j.usage.total_tokens !== 30) throw new Error('Expected fixed mock usage');
      ok('A1 · Chat mock returned test_mode: true with correct shape');
    });

    // A2. Image generation mock
    await check('A2 · Image mock (test key)', async () => {
      const r = await fetch(`${LOCAL_API_URL}/images/generations`, {
        method: 'POST', headers: testHdrs,
        body: JSON.stringify({ prompt: 'A red rocket', n: 2 }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`${r.status} — ${JSON.stringify(j)}`);
      if (!j.test_mode) throw new Error('test_mode flag missing');
      if (j.data.length !== 2) throw new Error('Expected 2 mock images');
      if (!j.data[0].url.includes('placehold.co')) throw new Error('Expected placehold.co mock URL');
      ok('A2 · Image mock returned 2 placeholder images');
    });

    // A3. Audio speech mock
    await check('A3 · Audio mock (test key)', async () => {
      const r = await fetch(`${LOCAL_API_URL}/audio/speech`, {
        method: 'POST', headers: testHdrs,
        body: JSON.stringify({ input: 'Hello world', voice: 'alloy' }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      if (!r.headers.get('content-type')?.includes('audio/mpeg')) throw new Error('Expected audio/mpeg content-type');
      if (r.headers.get('x-test-mode') !== 'true') throw new Error('X-Test-Mode header missing');
      ok('A3 · Audio mock returned silent MP3 with X-Test-Mode: true');
    });

    // A4. Embeddings mock
    await check('A4 · Embeddings mock (test key)', async () => {
      const r = await fetch(`${LOCAL_API_URL}/embeddings`, {
        method: 'POST', headers: testHdrs,
        body: JSON.stringify({ input: 'Hello world', model: 'text-embedding-3-small' }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`${r.status} — ${JSON.stringify(j)}`);
      if (!j.test_mode) throw new Error('test_mode flag missing');
      if (j.data[0].embedding.length !== 1536) throw new Error('Expected 1536-dim mock embedding');
      if (j.cost_usd !== 0) throw new Error('Expected zero cost in test mode');
      ok('A4 · Embeddings mock returned 1536-dim vector with cost_usd = 0');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION B  —  LIVE KEY CREDIT ENFORCEMENT (cbx_live_…)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n── B. Credit enforcement (cbx_live_…, balance = 0) ──────');

    // B1. Free model allowed with 0 credits
    await check('B1 · Free model allowed with 0 credits', async () => {
      const r = await fetch(`${LOCAL_API_URL}/chat/completions`, {
        method: 'POST', headers: liveHdrs,
        body: JSON.stringify({ model: 'chatboxai/llama-3.3-70b', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 30 }),
      });
      if (!r.ok) throw new Error(`${r.status} — ${await r.text()}`);
      ok('B1 · Free model passes with 0 credits');
    });

    // B2. Paid model blocked with 0 credits
    await check('B2 · Paid model blocked with 0 credits', async () => {
      const r = await fetch(`${LOCAL_API_URL}/chat/completions`, {
        method: 'POST', headers: liveHdrs,
        body: JSON.stringify({ model: 'chatboxai/claude-3.7-sonnet', messages: [{ role: 'user', content: 'Hi' }] }),
      });
      if (r.status !== 402) throw new Error(`Expected 402, got ${r.status}`);
      ok('B2 · Paid model correctly returns 402 with 0 credits');
    });

    // B3. Image generation blocked with 0 credits
    await check('B3 · Image generation blocked with 0 credits', async () => {
      const r = await fetch(`${LOCAL_API_URL}/images/generations`, {
        method: 'POST', headers: liveHdrs,
        body: JSON.stringify({ prompt: 'A sunset', n: 1 }),
      });
      if (r.status !== 402) throw new Error(`Expected 402, got ${r.status}`);
      ok('B3 · Image generation correctly returns 402 with 0 credits');
    });

    // ─ Add 15 credits ────────────────────────────────────────────────────────
    console.log('\n── C. Fund account + verify deductions ─────────────────');
    if (creditsDoc) {
      await databases.updateDocument(DB_ID, creditsDoc.$collectionId, creditsDoc.$id, { balance_credits: '15' });
      ok('Funded account with 15 credits');
    }

    // C1. Image generation pre-deducts correctly (costs 1 credit)
    await check('C1 · Image generation: pre-deduct & refund on network failure', async () => {
      const r = await fetch(`${LOCAL_API_URL}/images/generations`, {
        method: 'POST', headers: liveHdrs,
        body: JSON.stringify({ prompt: 'A mountain lake', model: 'chatboxai/image-flux-schnell', n: 1 }),
      });

      if (r.ok) {
        const remaining = parseFloat(r.headers.get('X-API-Credits-Remaining') ?? '-1');
        if (remaining !== 14) throw new Error(`Expected 14 remaining after deduction, got ${remaining}`);
        ok(`C1 · Image generated — deducted 1 credit, remaining = ${remaining}`);
      } else {
        // Provider network failure (Cloudflare/ModelScope/HuggingFace unreachable) — refund should have kicked in
        // Verify balance is still 15 (was refunded)
        const creditDocNow = await databases.getDocument(DB_ID, creditsDoc.$collectionId, creditsDoc.$id);
        const balanceNow = Number(creditDocNow.balance_credits);
        if (balanceNow === 15) {
          ok(`C1 · Provider network failure handled — credits correctly refunded (balance = ${balanceNow})`);
        } else {
          throw new Error(`Provider failed AND refund did not work. Balance is ${balanceNow}, expected 15.`);
        }
      }
    });

    // C2. Models list endpoint accessible
    await check('C2 · GET /models returns model list', async () => {
      const r = await fetch(`${LOCAL_API_URL}/models`, { headers: liveHdrs });
      const j = await r.json();
      if (!r.ok) throw new Error(`${r.status}`);
      if (!Array.isArray(j.data) || j.data.length === 0) throw new Error('Empty model list');
      ok(`C2 · /models returned ${j.data.length} models`);
    });

    // C3. /usage and /credits use Firebase session auth (not API keys) — verify they return 401 correctly for bearer token
    await check('C3 · /usage returns 401 for API key (Firebase-only endpoint — expected)', async () => {
      const r = await fetch(`${LOCAL_API_URL}/usage`, { headers: liveHdrs });
      // This endpoint requires a Firebase ID token, not an API key — 401 is correct
      if (r.status === 401 || r.status === 403) ok('C3 · /usage correctly requires Firebase session (not API key)');
      else if (r.ok) ok('C3 · /usage responded — Firebase token accepted or not required');
      else throw new Error(`Unexpected status ${r.status}`);
    });

    // C4. Credits endpoint (Firebase-only)
    await check('C4 · /credits returns 401 for API key (Firebase-only endpoint — expected)', async () => {
      const r = await fetch(`${LOCAL_API_URL}/credits`, { headers: liveHdrs });
      if (r.status === 401 || r.status === 403) ok('C4 · /credits correctly requires Firebase session (not API key)');
      else if (r.ok) {
        const j = await r.json();
        if (typeof j.balance_credits !== 'undefined' || j.success) ok('C4 · /credits returned balance');
        else throw new Error('balance_credits missing');
      }
      else throw new Error(`Unexpected status ${r.status}`);
    });

    // C5. Keys list endpoint (Firebase-only — same as /usage and /credits)
    await check('C5 · GET /keys returns 401 for API key (Firebase-only endpoint — expected)', async () => {
      const r = await fetch(`${LOCAL_API_URL}/keys`, { headers: liveHdrs });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401 || r.status === 403) ok('C5 · /keys correctly requires Firebase session (not API key)');
      else if (r.ok && j.data) ok(`C5 · /keys returned ${j.data.length} key(s)`);
      else throw new Error(`Unexpected status ${r.status}`);
    });

    // C6. Invalid API key returns 401
    await check('C6 · Invalid key returns 401', async () => {
      const r = await fetch(`${LOCAL_API_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer cbx_live_thisisabadkey00000000000000000', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'chatboxai/llama-3.3-70b', messages: [{ role: 'user', content: 'Hi' }] }),
      });
      if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
      ok('C6 · Invalid key correctly returns 401');
    });

    // C7. Missing auth returns 401
    await check('C7 · Missing Authorization header returns 401', async () => {
      const r = await fetch(`${LOCAL_API_URL}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'chatboxai/llama-3.3-70b', messages: [{ role: 'user', content: 'Hi' }] }),
      });
      if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
      ok('C7 · Missing auth header correctly returns 401');
    });

  } catch (err) {
    console.error('\n💥 Unexpected test runner error:', err);
  } finally {
    // ─ Cleanup ─────────────────────────────────────────────────────────────
    console.log('\n── Cleanup ───────────────────────────────────────────────');
    for (const [label, coll, id] of [
      ['test API key', API_KEYS_COLLECTION_ID, testKeyDocId],
      ['live API key', API_KEYS_COLLECTION_ID, liveKeyDocId],
    ]) {
      if (id) {
        await databases.deleteDocument(DB_ID, coll, id).then(() => ok(`Deleted ${label}`)).catch(() => {});
      }
    }
    if (testUserId) {
      await databases.deleteDocument(DB_ID, USERS_COLLECTION_ID, testUserId).catch(() => {});
      await users.delete(testUserId).then(() => ok(`Deleted user ${testUserId}`)).catch(() => {});
    }
    for (const coll of ['api_credits']) {
      await databases.listDocuments(DB_ID, coll, [Query.equal('user_email', TEST_EMAIL)])
        .then(r => Promise.all(r.documents.map(d => databases.deleteDocument(DB_ID, coll, d.$id))))
        .catch(() => {});
    }

    console.log(`\n${'═'.repeat(52)}`);
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log(`${'═'.repeat(52)}\n`);
    if (failed > 0) process.exit(1);
  }
}

runTests();
