/**
 * Seed Script — model_catalog collection
 * ═══════════════════════════════════════════════════════════════
 * Seeds the Appwrite `model_catalog` collection with initial model rates
 * as defined in the ChatboxAI Master Credit System specification.
 *
 * Usage:
 *   node scripts/seed-model-catalog.js
 *
 * Requires environment variables:
 *   APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
 *   APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DATABASE_ID)
 *
 * IMPORTANT:
 *   Before running this script, manually create the `model_catalog` collection
 *   in your Appwrite console with the following attributes:
 *
 *   Attribute Name    | Type    | Required | Default
 *   ──────────────────|─────────|──────────|────────
 *   public_id         | string  | yes      | –
 *   name              | string  | yes      | –
 *   category          | string  | yes      | –  ("free"|"paid"|"image"|"tool")
 *   input_rate        | integer | yes      | 1
 *   output_rate       | integer | no       | 0  (tools/images: 0)
 *   is_enabled        | boolean | yes      | true
 *   provider          | string  | no       | –
 *   description       | string  | no       | –
 *   created_at        | string  | no       | –
 *   updated_at        | string  | no       | –
 *
 *   Index: public_id (unique, key index)
 *   Index: category (key index)
 *   Index: is_enabled (key index)
 */

import { Client, Databases, ID, Query } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const ENDPOINT   = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'main';
const COLLECTION = process.env.APPWRITE_MODEL_CATALOG_COLLECTION_ID || 'model_catalog';

if (!PROJECT_ID || !API_KEY) {
  console.error('❌ Missing APPWRITE_PROJECT_ID or APPWRITE_API_KEY in environment.');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

// ── Model catalog seed data ───────────────────────────────────────────────────
// Format: { publicId, name, category, inputRate, outputRate, provider, description }
//
// Credit Formula:
//   inputUnits  = ceil(promptTokens / 100)
//   outputUnits = ceil(completionTokens / 100)
//   creditsUsed = (inputUnits × inputRate) + (outputUnits × outputRate)

const MODELS = [
  // ── Free Models ───────────────────────────────────────────────────────────
  {
    public_id: 'chatboxai/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    category: 'free',
    input_rate: 1,
    output_rate: 2,
    provider: 'google',
    description: 'Fast, efficient Gemini model for everyday tasks.',
  },
  {
    public_id: 'chatboxai/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    category: 'free',
    input_rate: 1,
    output_rate: 2,
    provider: 'google',
    description: 'Google Gemini Flash — free tier model.',
  },
  {
    public_id: 'chatboxai/llama-3.3-70b',
    name: 'Llama 3.3 70B',
    category: 'free',
    input_rate: 2,
    output_rate: 3,
    provider: 'groq',
    description: 'Meta Llama 3.3 70B — high quality open-source model.',
  },
  {
    public_id: 'chatboxai/llama-3.1-8b',
    name: 'Llama 3.1 8B',
    category: 'free',
    input_rate: 1,
    output_rate: 2,
    provider: 'groq',
    description: 'Meta Llama 3.1 8B — lightweight open-source model.',
  },
  {
    public_id: 'chatboxai/deepseek-r1',
    name: 'DeepSeek R1',
    category: 'free',
    input_rate: 3,
    output_rate: 4,
    provider: 'openrouter',
    description: 'DeepSeek R1 — powerful reasoning model.',
  },
  {
    public_id: 'chatboxai/deepseek-v3',
    name: 'DeepSeek V3',
    category: 'free',
    input_rate: 2,
    output_rate: 3,
    provider: 'openrouter',
    description: 'DeepSeek V3 — advanced open-source model.',
  },
  {
    public_id: 'chatboxai/qwen-2.5-72b',
    name: 'Qwen 2.5 72B',
    category: 'free',
    input_rate: 2,
    output_rate: 3,
    provider: 'openrouter',
    description: 'Alibaba Qwen 2.5 72B — multilingual open-source model.',
  },
  {
    public_id: 'chatboxai/mistral-7b',
    name: 'Mistral 7B',
    category: 'free',
    input_rate: 1,
    output_rate: 2,
    provider: 'openrouter',
    description: 'Mistral 7B — efficient European open-source model.',
  },

  // ── Paid Models ───────────────────────────────────────────────────────────
  {
    public_id: 'chatboxai/gemini-2.0-pro',
    name: 'Gemini 2.0 Pro',
    category: 'paid',
    input_rate: 5,
    output_rate: 6,
    provider: 'google',
    description: 'Google Gemini Pro — advanced premium model.',
  },
  {
    public_id: 'chatboxai/gpt-4o',
    name: 'GPT-4o',
    category: 'paid',
    input_rate: 8,
    output_rate: 10,
    provider: 'openai',
    description: 'OpenAI GPT-4o — flagship multimodal model.',
  },
  {
    public_id: 'chatboxai/gpt-4.1',
    name: 'GPT-4.1',
    category: 'paid',
    input_rate: 8,
    output_rate: 10,
    provider: 'openai',
    description: 'OpenAI GPT-4.1 — latest GPT-4 iteration.',
  },
  {
    public_id: 'chatboxai/gpt-5',
    name: 'GPT-5',
    category: 'paid',
    input_rate: 10,
    output_rate: 12,
    provider: 'openai',
    description: 'OpenAI GPT-5 — most capable OpenAI model.',
  },
  {
    public_id: 'chatboxai/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    category: 'paid',
    input_rate: 7,
    output_rate: 9,
    provider: 'anthropic',
    description: 'Anthropic Claude Sonnet — balanced intelligence and speed.',
  },
  {
    public_id: 'chatboxai/claude-opus-4',
    name: 'Claude Opus 4',
    category: 'paid',
    input_rate: 15,
    output_rate: 18,
    provider: 'anthropic',
    description: 'Anthropic Claude Opus — most powerful Claude model.',
  },
  {
    public_id: 'chatboxai/o3',
    name: 'OpenAI o3',
    category: 'paid',
    input_rate: 12,
    output_rate: 15,
    provider: 'openai',
    description: 'OpenAI o3 — advanced reasoning model.',
  },
  {
    public_id: 'chatboxai/o4-mini',
    name: 'OpenAI o4-mini',
    category: 'paid',
    input_rate: 5,
    output_rate: 7,
    provider: 'openai',
    description: 'OpenAI o4-mini — efficient reasoning model.',
  },

  // ── Image Models ──────────────────────────────────────────────────────────
  // For images: input_rate = fixed credit cost per image, output_rate = 0
  {
    public_id: 'flux',
    name: 'Flux',
    category: 'image',
    input_rate: 120,
    output_rate: 0,
    provider: 'replicate',
    description: 'Flux — high quality image generation.',
  },
  {
    public_id: 'imagen',
    name: 'Imagen 3',
    category: 'image',
    input_rate: 180,
    output_rate: 0,
    provider: 'google',
    description: 'Google Imagen 3 — premium image generation.',
  },
  {
    public_id: 'gpt_image',
    name: 'GPT Image',
    category: 'image',
    input_rate: 250,
    output_rate: 0,
    provider: 'openai',
    description: 'OpenAI GPT Image generation.',
  },
  {
    public_id: 'dalle',
    name: 'DALL-E 3',
    category: 'image',
    input_rate: 300,
    output_rate: 0,
    provider: 'openai',
    description: 'OpenAI DALL-E 3 — advanced image generation.',
  },
  {
    public_id: 'sdxl',
    name: 'Stable Diffusion XL',
    category: 'image',
    input_rate: 80,
    output_rate: 0,
    provider: 'replicate',
    description: 'SDXL — open-source image generation.',
  },

  // ── Tool Costs ────────────────────────────────────────────────────────────
  // For tools: input_rate = fixed credit cost per use, output_rate = 0
  {
    public_id: 'deep_search',
    name: 'Deep Search',
    category: 'tool',
    input_rate: 100,
    output_rate: 0,
    provider: 'internal',
    description: 'Deep Research — comprehensive multi-source search.',
  },
  {
    public_id: 'website_builder',
    name: 'Website Builder',
    category: 'tool',
    input_rate: 250,
    output_rate: 0,
    provider: 'internal',
    description: 'AI-powered website generation.',
  },
  {
    public_id: 'code_interpreter',
    name: 'Code Interpreter',
    category: 'tool',
    input_rate: 80,
    output_rate: 0,
    provider: 'internal',
    description: 'Execute and analyze code.',
  },
  {
    public_id: 'web_search',
    name: 'Web Search',
    category: 'tool',
    input_rate: 25,
    output_rate: 0,
    provider: 'internal',
    description: 'Real-time web search augmentation.',
  },
];

// ── Seed function ─────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\n🌱 Seeding model_catalog collection (${MODELS.length} entries)...`);
  console.log(`   DB: ${DB_ID}  |  Collection: ${COLLECTION}\n`);

  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;
  let failed  = 0;

  for (const model of MODELS) {
    try {
      // Check if document already exists
      const existing = await databases.listDocuments(DB_ID, COLLECTION, [
        Query.equal('public_id', model.public_id),
        Query.limit(1),
      ]);

      if (existing.documents.length > 0) {
        // Update existing
        await databases.updateDocument(DB_ID, COLLECTION, existing.documents[0].$id, {
          ...model,
          is_enabled: true,
          updated_at: now,
        });
        console.log(`  ✏️  Updated: ${model.name} (${model.public_id})`);
        updated++;
      } else {
        // Create new
        await databases.createDocument(DB_ID, COLLECTION, ID.unique(), {
          ...model,
          is_enabled: true,
          created_at: now,
          updated_at: now,
        });
        console.log(`  ✅  Created: ${model.name} [${model.category}] — in:${model.input_rate} out:${model.output_rate}`);
        created++;
      }
    } catch (err) {
      console.error(`  ❌  Failed: ${model.name} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Seed complete:`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ✏️  Updated: ${updated}`);
  console.log(`   ❌ Failed:  ${failed}`);
  console.log(`\n💡 Tip: You can edit rates anytime in your Appwrite Console → model_catalog collection.\n`);
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
