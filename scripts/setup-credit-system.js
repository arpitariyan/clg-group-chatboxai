/**
 * ═══════════════════════════════════════════════════════════════════
 * ChatboxAI — Credit System v2 Full Setup Script
 * ═══════════════════════════════════════════════════════════════════
 *
 * Yeh script Appwrite mein seedha jaake:
 *   1. `model_catalog` collection banata hai (agar exist nahi karta)
 *   2. `credit_transactions` collection banata hai
 *   3. `users` collection mein `last_daily_reset` attribute add karta hai
 *   4. Sab models, images, aur tools ke rates seed karta hai
 *
 * Usage:
 *   node scripts/setup-credit-system.js
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { Client, Databases, ID, Query, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// ── Config ────────────────────────────────────────────────────────────────────
const ENDPOINT   = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'main';
const USERS_COLL = process.env.APPWRITE_USERS_COLLECTION_ID || 'users';
const MODEL_CATALOG_COLL     = 'model_catalog';
const CREDIT_TRANSACTIONS_COLL = 'credit_transactions';

if (!PROJECT_ID || !API_KEY) {
  console.error('\n❌ APPWRITE_PROJECT_ID ya APPWRITE_API_KEY env mein nahi mila!\n');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

// ── Helper: safely try an operation ──────────────────────────────────────────
async function tryOp(label, fn) {
  try {
    const result = await fn();
    console.log(`  ✅  ${label}`);
    return result;
  } catch (err) {
    if (err.code === 409) {
      console.log(`  ⏭️   ${label} (already exists)`);
    } else {
      console.error(`  ❌  ${label} — ${err.message}`);
    }
    return null;
  }
}

// ── Helper: wait for attribute to become available ────────────────────────────
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Step 1: Create model_catalog collection ───────────────────────────────────
async function createModelCatalogCollection() {
  console.log('\n📦 Step 1: model_catalog collection...');

  // Create collection
  await tryOp('Create model_catalog collection', () =>
    databases.createCollection(DB_ID, MODEL_CATALOG_COLL, 'Model Catalog', [
      Permission.read(Role.any()),
      Permission.create(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any()),
    ])
  );

  await sleep(1000); // Wait for collection to be ready

  // Create attributes
  const attrs = [
    () => databases.createStringAttribute(DB_ID, MODEL_CATALOG_COLL, 'public_id', 200, true),
    () => databases.createStringAttribute(DB_ID, MODEL_CATALOG_COLL, 'name', 200, true),
    () => databases.createStringAttribute(DB_ID, MODEL_CATALOG_COLL, 'category', 20, true),
    () => databases.createIntegerAttribute(DB_ID, MODEL_CATALOG_COLL, 'input_rate', true, 0, 10000, 1),
    () => databases.createIntegerAttribute(DB_ID, MODEL_CATALOG_COLL, 'output_rate', false, 0, 10000, 0),
    () => databases.createBooleanAttribute(DB_ID, MODEL_CATALOG_COLL, 'is_enabled', false, true),
    () => databases.createStringAttribute(DB_ID, MODEL_CATALOG_COLL, 'provider', 100, false),
    () => databases.createStringAttribute(DB_ID, MODEL_CATALOG_COLL, 'description', 500, false),
    () => databases.createStringAttribute(DB_ID, MODEL_CATALOG_COLL, 'created_at', 100, false),
    () => databases.createStringAttribute(DB_ID, MODEL_CATALOG_COLL, 'updated_at', 100, false),
  ];

  const attrLabels = [
    'attribute: public_id',
    'attribute: name',
    'attribute: category',
    'attribute: input_rate',
    'attribute: output_rate',
    'attribute: is_enabled',
    'attribute: provider',
    'attribute: description',
    'attribute: created_at',
    'attribute: updated_at',
  ];

  for (let i = 0; i < attrs.length; i++) {
    await tryOp(attrLabels[i], attrs[i]);
    await sleep(300);
  }

  // Wait for attributes to be ready before creating indexes
  console.log('  ⏳ Waiting 3s for attributes to be ready...');
  await sleep(3000);

  // Create indexes
  await tryOp('index: public_id (unique)', () =>
    databases.createIndex(DB_ID, MODEL_CATALOG_COLL, 'idx_public_id', 'unique', ['public_id'])
  );
  await sleep(500);
  await tryOp('index: category', () =>
    databases.createIndex(DB_ID, MODEL_CATALOG_COLL, 'idx_category', 'key', ['category'])
  );
  await sleep(500);
  await tryOp('index: is_enabled', () =>
    databases.createIndex(DB_ID, MODEL_CATALOG_COLL, 'idx_is_enabled', 'key', ['is_enabled'])
  );

  console.log('  ✅ model_catalog collection ready!');
}

// ── Step 2: Create credit_transactions collection ─────────────────────────────
async function createCreditTransactionsCollection() {
  console.log('\n📦 Step 2: credit_transactions collection...');

  await tryOp('Create credit_transactions collection', () =>
    databases.createCollection(DB_ID, CREDIT_TRANSACTIONS_COLL, 'Credit Transactions', [
      Permission.read(Role.any()),
      Permission.create(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any()),
    ])
  );

  await sleep(1000);

  const attrs = [
    () => databases.createStringAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'user_id', 200, true),
    () => databases.createStringAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'user_email', 320, false),
    () => databases.createStringAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'wallet_type', 20, true),
    () => databases.createStringAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'model', 200, false),
    () => databases.createStringAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'model_category', 20, false),
    () => databases.createIntegerAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'tokens_input', false, 0),
    () => databases.createIntegerAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'tokens_output', false, 0),
    () => databases.createIntegerAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'credits_spent', true, 0),
    () => databases.createStringAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'endpoint', 100, false),
    () => databases.createIntegerAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'balance_before', false, 0),
    () => databases.createIntegerAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'balance_after', false, 0),
    () => databases.createStringAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'description', 500, false),
    () => databases.createStringAttribute(DB_ID, CREDIT_TRANSACTIONS_COLL, 'created_at', 100, false),
  ];

  const attrLabels = [
    'attribute: user_id',
    'attribute: user_email',
    'attribute: wallet_type',
    'attribute: model',
    'attribute: model_category',
    'attribute: tokens_input',
    'attribute: tokens_output',
    'attribute: credits_spent',
    'attribute: endpoint',
    'attribute: balance_before',
    'attribute: balance_after',
    'attribute: description',
    'attribute: created_at',
  ];

  for (let i = 0; i < attrs.length; i++) {
    await tryOp(attrLabels[i], attrs[i]);
    await sleep(300);
  }

  console.log('  ⏳ Waiting 3s for attributes to be ready...');
  await sleep(3000);

  await tryOp('index: user_id', () =>
    databases.createIndex(DB_ID, CREDIT_TRANSACTIONS_COLL, 'idx_user_id', 'key', ['user_id'])
  );
  await sleep(500);
  await tryOp('index: created_at', () =>
    databases.createIndex(DB_ID, CREDIT_TRANSACTIONS_COLL, 'idx_created_at', 'key', ['created_at'])
  );
  await sleep(500);
  await tryOp('index: wallet_type', () =>
    databases.createIndex(DB_ID, CREDIT_TRANSACTIONS_COLL, 'idx_wallet_type', 'key', ['wallet_type'])
  );

  console.log('  ✅ credit_transactions collection ready!');
}

// ── Step 3: Add last_daily_reset to users collection ─────────────────────────
async function addUsersAttributes() {
  console.log('\n📦 Step 3: users collection — adding new attributes...');

  await tryOp('attribute: last_daily_reset (string)', () =>
    databases.createStringAttribute(DB_ID, USERS_COLL, 'last_daily_reset', 20, false)
  );
  await sleep(500);

  await tryOp('attribute: paid_credits (integer)', () =>
    databases.createIntegerAttribute(DB_ID, USERS_COLL, 'paid_credits', false, 0)
  );
  await sleep(500);

  await tryOp('attribute: billing_date (integer)', () =>
    databases.createIntegerAttribute(DB_ID, USERS_COLL, 'billing_date', false, 1, 28, 1)
  );

  console.log('  ✅ users attributes ready!');
}

// ── Step 4: Seed model_catalog with all rates ─────────────────────────────────
const SEED_DATA = [
  // ── FREE MODELS ───────────────────────────────────────────────────────────
  { public_id: 'chatboxai/gemini-2.5-flash',  name: 'Gemini 2.5 Flash',    category: 'free',  input_rate: 1,  output_rate: 2,  provider: 'google',      description: 'Fast Gemini model — everyday tasks.' },
  { public_id: 'chatboxai/gemini-2.0-flash',  name: 'Gemini 2.0 Flash',    category: 'free',  input_rate: 1,  output_rate: 2,  provider: 'google',      description: 'Google Gemini Flash — free tier.' },
  { public_id: 'chatboxai/gemini-flash',       name: 'Gemini Flash',        category: 'free',  input_rate: 1,  output_rate: 2,  provider: 'google',      description: 'Google Gemini Flash alias.' },
  { public_id: 'chatboxai/llama-3.3-70b',     name: 'Llama 3.3 70B',       category: 'free',  input_rate: 2,  output_rate: 3,  provider: 'groq',        description: 'Meta Llama 3.3 70B — high quality OSS.' },
  { public_id: 'chatboxai/llama-3.1-8b',      name: 'Llama 3.1 8B',        category: 'free',  input_rate: 1,  output_rate: 2,  provider: 'groq',        description: 'Meta Llama 3.1 8B — lightweight OSS.' },
  { public_id: 'chatboxai/llama-3.1-70b',     name: 'Llama 3.1 70B',       category: 'free',  input_rate: 2,  output_rate: 3,  provider: 'groq',        description: 'Meta Llama 3.1 70B.' },
  { public_id: 'chatboxai/deepseek-r1',        name: 'DeepSeek R1',         category: 'free',  input_rate: 3,  output_rate: 4,  provider: 'openrouter',  description: 'DeepSeek R1 — powerful reasoning model.' },
  { public_id: 'chatboxai/deepseek-v3',        name: 'DeepSeek V3',         category: 'free',  input_rate: 2,  output_rate: 3,  provider: 'openrouter',  description: 'DeepSeek V3 — advanced OSS model.' },
  { public_id: 'chatboxai/qwen-2.5-72b',      name: 'Qwen 2.5 72B',        category: 'free',  input_rate: 2,  output_rate: 3,  provider: 'openrouter',  description: 'Alibaba Qwen 2.5 72B — multilingual OSS.' },
  { public_id: 'chatboxai/mistral-7b',         name: 'Mistral 7B',          category: 'free',  input_rate: 1,  output_rate: 2,  provider: 'openrouter',  description: 'Mistral 7B — efficient European OSS.' },
  { public_id: 'chatboxai/mixtral-8x7b',      name: 'Mixtral 8x7B',        category: 'free',  input_rate: 2,  output_rate: 3,  provider: 'openrouter',  description: 'Mistral MoE 8x7B.' },

  // ── PAID MODELS ───────────────────────────────────────────────────────────
  { public_id: 'chatboxai/gemini-2.0-pro',    name: 'Gemini 2.0 Pro',       category: 'paid',  input_rate: 5,  output_rate: 6,  provider: 'google',      description: 'Google Gemini Pro — advanced premium model.' },
  { public_id: 'chatboxai/gemini-pro',         name: 'Gemini Pro',           category: 'paid',  input_rate: 5,  output_rate: 6,  provider: 'google',      description: 'Google Gemini Pro alias.' },
  { public_id: 'chatboxai/gpt-4o',             name: 'GPT-4o',               category: 'paid',  input_rate: 8,  output_rate: 10, provider: 'openai',      description: 'OpenAI GPT-4o — flagship multimodal model.' },
  { public_id: 'chatboxai/gpt-4.1',            name: 'GPT-4.1',              category: 'paid',  input_rate: 8,  output_rate: 10, provider: 'openai',      description: 'OpenAI GPT-4.1.' },
  { public_id: 'chatboxai/gpt-5',              name: 'GPT-5',                category: 'paid',  input_rate: 10, output_rate: 12, provider: 'openai',      description: 'OpenAI GPT-5 — most capable OpenAI model.' },
  { public_id: 'chatboxai/o3',                 name: 'OpenAI o3',            category: 'paid',  input_rate: 12, output_rate: 15, provider: 'openai',      description: 'OpenAI o3 — advanced reasoning.' },
  { public_id: 'chatboxai/o4-mini',            name: 'OpenAI o4-mini',       category: 'paid',  input_rate: 5,  output_rate: 7,  provider: 'openai',      description: 'OpenAI o4-mini — efficient reasoning.' },
  { public_id: 'chatboxai/claude-sonnet-4',   name: 'Claude Sonnet 4',      category: 'paid',  input_rate: 7,  output_rate: 9,  provider: 'anthropic',   description: 'Anthropic Claude Sonnet 4.' },
  { public_id: 'chatboxai/claude-sonnet-3.5', name: 'Claude Sonnet 3.5',    category: 'paid',  input_rate: 7,  output_rate: 9,  provider: 'anthropic',   description: 'Anthropic Claude Sonnet 3.5.' },
  { public_id: 'chatboxai/claude-opus-4',     name: 'Claude Opus 4',        category: 'paid',  input_rate: 15, output_rate: 18, provider: 'anthropic',   description: 'Anthropic Claude Opus — most powerful Claude.' },
  { public_id: 'chatboxai/claude-haiku-3.5',  name: 'Claude Haiku 3.5',     category: 'paid',  input_rate: 4,  output_rate: 5,  provider: 'anthropic',   description: 'Anthropic Claude Haiku — fastest Claude.' },

  // ── IMAGE MODELS (input_rate = fixed credits per image) ───────────────────
  { public_id: 'flux',       name: 'Flux',              category: 'image', input_rate: 120, output_rate: 0, provider: 'replicate', description: 'Flux — high quality image generation.' },
  { public_id: 'imagen',     name: 'Imagen 3',          category: 'image', input_rate: 180, output_rate: 0, provider: 'google',    description: 'Google Imagen 3 — premium image generation.' },
  { public_id: 'gpt_image',  name: 'GPT Image',         category: 'image', input_rate: 250, output_rate: 0, provider: 'openai',    description: 'OpenAI GPT Image generation.' },
  { public_id: 'dalle',      name: 'DALL-E 3',          category: 'image', input_rate: 300, output_rate: 0, provider: 'openai',    description: 'OpenAI DALL-E 3.' },
  { public_id: 'sdxl',       name: 'Stable Diffusion XL', category: 'image', input_rate: 80, output_rate: 0, provider: 'replicate', description: 'SDXL — open-source image generation.' },

  // ── TOOLS (input_rate = fixed credits per use) ────────────────────────────
  { public_id: 'deep_search',      name: 'Deep Search',      category: 'tool', input_rate: 100, output_rate: 0, provider: 'internal', description: 'Multi-source deep research.' },
  { public_id: 'website_builder',  name: 'Website Builder',  category: 'tool', input_rate: 250, output_rate: 0, provider: 'internal', description: 'AI-powered website generation.' },
  { public_id: 'code_interpreter', name: 'Code Interpreter', category: 'tool', input_rate: 80,  output_rate: 0, provider: 'internal', description: 'Execute and analyze code.' },
  { public_id: 'web_search',       name: 'Web Search',       category: 'tool', input_rate: 25,  output_rate: 0, provider: 'internal', description: 'Real-time web search.' },
  { public_id: 'tts',              name: 'Text to Speech',   category: 'tool', input_rate: 10,  output_rate: 0, provider: 'internal', description: 'Text to speech conversion.' },
];

async function seedModelCatalog() {
  console.log(`\n🌱 Step 4: Seeding model_catalog (${SEED_DATA.length} entries)...`);
  const now = new Date().toISOString();
  let created = 0, updated = 0, failed = 0;

  for (const model of SEED_DATA) {
    try {
      // Check if already exists
      const existing = await databases.listDocuments(DB_ID, MODEL_CATALOG_COLL, [
        Query.equal('public_id', model.public_id),
        Query.limit(1),
      ]);

      if (existing.documents.length > 0) {
        await databases.updateDocument(DB_ID, MODEL_CATALOG_COLL, existing.documents[0].$id, {
          ...model,
          is_enabled: true,
          updated_at: now,
        });
        console.log(`  ✏️  Updated: ${model.name}`);
        updated++;
      } else {
        await databases.createDocument(DB_ID, MODEL_CATALOG_COLL, ID.unique(), {
          ...model,
          is_enabled: true,
          created_at: now,
          updated_at: now,
        });
        const tag = model.category === 'free' ? '🟢' : model.category === 'paid' ? '🔵' : model.category === 'image' ? '🖼️ ' : '🔧';
        console.log(`  ${tag} Created: ${model.name.padEnd(24)} [${model.category}] in:${model.input_rate} out:${model.output_rate}`);
        created++;
      }
    } catch (err) {
      console.error(`  ❌  Failed: ${model.name} — ${err.message}`);
      failed++;
    }
    await sleep(150); // Small delay to avoid rate limiting
  }

  console.log(`\n  📊 Seed result: ✅ ${created} created | ✏️  ${updated} updated | ❌ ${failed} failed`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     ChatboxAI — Credit System v2 Setup Script           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n  Endpoint:   ${ENDPOINT}`);
  console.log(`  Project:    ${PROJECT_ID}`);
  console.log(`  Database:   ${DB_ID}`);
  console.log(`  Users Coll: ${USERS_COLL}`);

  try {
    await createModelCatalogCollection();
    await createCreditTransactionsCollection();
    await addUsersAttributes();
    await seedModelCatalog();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅  Setup Complete! Credit System v2 is ready.          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\n📋 Next steps:');
    console.log('   1. Add to .env.local:');
    console.log('      APPWRITE_MODEL_CATALOG_COLLECTION_ID=model_catalog');
    console.log('      NEXT_PUBLIC_APPWRITE_MODEL_CATALOG_COLLECTION_ID=model_catalog');
    console.log('   2. Deploy ya restart your Next.js app');
    console.log('   3. Test: GET /api/credits/balance\n');
  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();
