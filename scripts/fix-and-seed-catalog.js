/**
 * Fix + Seed Script — model_catalog
 * Fixes the input_rate attribute (required=true, no default) then seeds all data.
 */

import { Client, Databases, ID, Query } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const ENDPOINT   = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'main';
const COLL       = 'model_catalog';

const client    = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new Databases(client);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tryOp(label, fn) {
  try {
    await fn();
    console.log(`  ✅  ${label}`);
  } catch (err) {
    if (err.code === 409) console.log(`  ⏭️   ${label} (already exists)`);
    else console.error(`  ❌  ${label} — ${err.message}`);
  }
}

const SEED_DATA = [
  // FREE MODELS
  { public_id: 'chatboxai/gemini-2.5-flash',  name: 'Gemini 2.5 Flash',       category: 'free',  input_rate: 1,  output_rate: 2,  provider: 'google',    description: 'Fast Gemini model — everyday tasks.' },
  { public_id: 'chatboxai/gemini-2.0-flash',  name: 'Gemini 2.0 Flash',       category: 'free',  input_rate: 1,  output_rate: 2,  provider: 'google',    description: 'Google Gemini Flash — free tier.' },
  { public_id: 'chatboxai/gemini-flash',       name: 'Gemini Flash',           category: 'free',  input_rate: 1,  output_rate: 2,  provider: 'google',    description: 'Google Gemini Flash alias.' },
  { public_id: 'chatboxai/llama-3.3-70b',     name: 'Llama 3.3 70B',          category: 'free',  input_rate: 2,  output_rate: 3,  provider: 'groq',      description: 'Meta Llama 3.3 70B — high quality OSS.' },
  { public_id: 'chatboxai/llama-3.1-8b',      name: 'Llama 3.1 8B',           category: 'free',  input_rate: 1,  output_rate: 2,  provider: 'groq',      description: 'Meta Llama 3.1 8B — lightweight OSS.' },
  { public_id: 'chatboxai/llama-3.1-70b',     name: 'Llama 3.1 70B',          category: 'free',  input_rate: 2,  output_rate: 3,  provider: 'groq',      description: 'Meta Llama 3.1 70B.' },
  { public_id: 'chatboxai/deepseek-r1',        name: 'DeepSeek R1',            category: 'free',  input_rate: 3,  output_rate: 4,  provider: 'openrouter', description: 'DeepSeek R1 — powerful reasoning model.' },
  { public_id: 'chatboxai/deepseek-v3',        name: 'DeepSeek V3',            category: 'free',  input_rate: 2,  output_rate: 3,  provider: 'openrouter', description: 'DeepSeek V3 — advanced OSS model.' },
  { public_id: 'chatboxai/qwen-2.5-72b',      name: 'Qwen 2.5 72B',           category: 'free',  input_rate: 2,  output_rate: 3,  provider: 'openrouter', description: 'Alibaba Qwen 2.5 72B — multilingual OSS.' },
  { public_id: 'chatboxai/mistral-7b',         name: 'Mistral 7B',             category: 'free',  input_rate: 1,  output_rate: 2,  provider: 'openrouter', description: 'Mistral 7B — efficient European OSS.' },
  { public_id: 'chatboxai/mixtral-8x7b',      name: 'Mixtral 8x7B',           category: 'free',  input_rate: 2,  output_rate: 3,  provider: 'openrouter', description: 'Mistral MoE 8x7B.' },
  // PAID MODELS
  { public_id: 'chatboxai/gemini-2.0-pro',    name: 'Gemini 2.0 Pro',          category: 'paid',  input_rate: 5,  output_rate: 6,  provider: 'google',    description: 'Google Gemini Pro — advanced premium model.' },
  { public_id: 'chatboxai/gemini-pro',         name: 'Gemini Pro',              category: 'paid',  input_rate: 5,  output_rate: 6,  provider: 'google',    description: 'Google Gemini Pro alias.' },
  { public_id: 'chatboxai/gpt-4o',             name: 'GPT-4o',                  category: 'paid',  input_rate: 8,  output_rate: 10, provider: 'openai',    description: 'OpenAI GPT-4o — flagship multimodal model.' },
  { public_id: 'chatboxai/gpt-4.1',            name: 'GPT-4.1',                 category: 'paid',  input_rate: 8,  output_rate: 10, provider: 'openai',    description: 'OpenAI GPT-4.1.' },
  { public_id: 'chatboxai/gpt-5',              name: 'GPT-5',                   category: 'paid',  input_rate: 10, output_rate: 12, provider: 'openai',    description: 'OpenAI GPT-5 — most capable OpenAI model.' },
  { public_id: 'chatboxai/o3',                 name: 'OpenAI o3',               category: 'paid',  input_rate: 12, output_rate: 15, provider: 'openai',    description: 'OpenAI o3 — advanced reasoning.' },
  { public_id: 'chatboxai/o4-mini',            name: 'OpenAI o4-mini',          category: 'paid',  input_rate: 5,  output_rate: 7,  provider: 'openai',    description: 'OpenAI o4-mini — efficient reasoning.' },
  { public_id: 'chatboxai/claude-sonnet-4',   name: 'Claude Sonnet 4',         category: 'paid',  input_rate: 7,  output_rate: 9,  provider: 'anthropic', description: 'Anthropic Claude Sonnet 4.' },
  { public_id: 'chatboxai/claude-sonnet-3.5', name: 'Claude Sonnet 3.5',       category: 'paid',  input_rate: 7,  output_rate: 9,  provider: 'anthropic', description: 'Anthropic Claude Sonnet 3.5.' },
  { public_id: 'chatboxai/claude-opus-4',     name: 'Claude Opus 4',           category: 'paid',  input_rate: 15, output_rate: 18, provider: 'anthropic', description: 'Anthropic Claude Opus — most powerful Claude.' },
  { public_id: 'chatboxai/claude-haiku-3.5',  name: 'Claude Haiku 3.5',        category: 'paid',  input_rate: 4,  output_rate: 5,  provider: 'anthropic', description: 'Anthropic Claude Haiku — fastest Claude.' },
  // IMAGE MODELS
  { public_id: 'flux',       name: 'Flux',               category: 'image', input_rate: 120, output_rate: 0, provider: 'replicate', description: 'Flux — high quality image generation.' },
  { public_id: 'imagen',     name: 'Imagen 3',           category: 'image', input_rate: 180, output_rate: 0, provider: 'google',    description: 'Google Imagen 3 — premium image generation.' },
  { public_id: 'gpt_image',  name: 'GPT Image',          category: 'image', input_rate: 250, output_rate: 0, provider: 'openai',    description: 'OpenAI GPT Image generation.' },
  { public_id: 'dalle',      name: 'DALL-E 3',           category: 'image', input_rate: 300, output_rate: 0, provider: 'openai',    description: 'OpenAI DALL-E 3.' },
  { public_id: 'sdxl',       name: 'Stable Diffusion XL', category: 'image', input_rate: 80, output_rate: 0, provider: 'replicate', description: 'SDXL — open-source image generation.' },
  // TOOLS
  { public_id: 'deep_search',      name: 'Deep Search',       category: 'tool', input_rate: 100, output_rate: 0, provider: 'internal', description: 'Multi-source deep research.' },
  { public_id: 'website_builder',  name: 'Website Builder',   category: 'tool', input_rate: 250, output_rate: 0, provider: 'internal', description: 'AI-powered website generation.' },
  { public_id: 'code_interpreter', name: 'Code Interpreter',  category: 'tool', input_rate: 80,  output_rate: 0, provider: 'internal', description: 'Execute and analyze code.' },
  { public_id: 'web_search',       name: 'Web Search',        category: 'tool', input_rate: 25,  output_rate: 0, provider: 'internal', description: 'Real-time web search.' },
  { public_id: 'tts',              name: 'Text to Speech',    category: 'tool', input_rate: 10,  output_rate: 0, provider: 'internal', description: 'Text to speech conversion.' },
];

async function main() {
  console.log('\n🔧 Fixing input_rate attribute...');

  // Fix: create input_rate as required=true WITHOUT a default value
  // Appwrite SDK: createIntegerAttribute(dbId, collId, key, required, min, max, default?)
  // Omitting the default param fixes the "Cannot set default value for required attribute" error
  await tryOp('attribute: input_rate (required, no default)', () =>
    databases.createIntegerAttribute(DB_ID, COLL, 'input_rate', true, 0, 100000)
  );

  console.log('  ⏳ Waiting 4s for attribute to be ready in Appwrite...');
  await sleep(4000);

  console.log(`\n🌱 Seeding ${SEED_DATA.length} models/images/tools into model_catalog...\n`);
  const now = new Date().toISOString();
  let created = 0, updated = 0, failed = 0;

  for (const model of SEED_DATA) {
    try {
      const existing = await databases.listDocuments(DB_ID, COLL, [
        Query.equal('public_id', model.public_id),
        Query.limit(1),
      ]);

      if (existing.documents.length > 0) {
        await databases.updateDocument(DB_ID, COLL, existing.documents[0].$id, {
          ...model,
          is_enabled: true,
          updated_at: now,
        });
        console.log(`  ✏️   Updated: ${model.name}`);
        updated++;
      } else {
        await databases.createDocument(DB_ID, COLL, ID.unique(), {
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
    await sleep(120);
  }

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  📊  Seed Complete!                                      ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ✏️  Updated: ${updated}`);
  console.log(`  ❌ Failed:  ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All model rates are now in Appwrite!');
    console.log('   Admin can edit rates anytime at: Appwrite Console → model_catalog\n');
  } else {
    console.log('\n⚠️  Some entries failed. Re-run this script to retry.\n');
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
