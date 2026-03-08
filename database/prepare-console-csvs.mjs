// database/prepare-console-csvs.mjs
// Preprocesses raw Supabase CSV exports into Appwrite-Console-importable CSVs.
// Run: node database/prepare-console-csvs.mjs
//
// Outputs clean CSVs into: database/csv-exports/console-ready/
// These files have:
//   - Only the columns that exist in Appwrite collection attributes
//   - System fields (id, updated_at, etc.) removed
//   - Supabase alias columns renamed to their Appwrite attribute names
//   - No BOM, no extra whitespace

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_DIR   = path.join(__dirname, 'csv-exports');
const OUT_DIR   = path.join(__dirname, 'csv-exports', 'console-ready');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// Fields that must be removed (Appwrite system fields or Supabase-only)
const STRIP_FIELDS = new Set([
  'id', '$id', '$createdAt', '$updatedAt', '$permissions',
  '$collectionId', '$databaseId', 'updated_at',
]);

// Global header aliases: Supabase column → Appwrite attribute
const HEADER_ALIASES = new Map([
  ['libid',            'libId'],
  ['lib_id',           'libId'],
  ['usersearchinput',  'userSearchInput'],
  ['searchresult',     'searchResult'],
  ['usedmodel',        'usedModel'],
  ['modelapi',         'modelApi'],
  ['analyzedfilescount','analyzedFilesCount'],
  ['processedfiles',   'processedFiles'],
  ['useremail',        'userEmail'],
  ['selectedmodel',    'selectedModel'],
  ['modelname',        'modelName'],
  ['hasfiles',         'hasFiles'],
  ['uploadedfiles',    'uploadedFiles'],
  ['processedat',      'processedAt'],
  ['generatedimagepath','generatedImagePath'],
  ['publicurl',        'publicUrl'],
  ['airespobj',        'aiResp'],
]);

// Per-collection config identical to migrate-from-supabase.mjs
const COLLECTIONS = [
  {
    key:            'Users',
    fileCandidates: ['Users.csv', 'Users_rows.csv', 'Users_rows (1).csv'],
    outputFile:     'Users.csv',
    allowedFields: [
      'created_at','email','name','plan','credits','last_monthly_reset',
      'mfa_enabled','mfa_email','accent_color','language','subscription_id',
      'subscription_start_date','subscription_end_date','subscription_status',
      'is_blocked','last_login','is_manual_assignment','team_id','is_team_member',
    ],
  },
  {
    key:            'Library',
    fileCandidates: ['Library.csv', 'Library_rows.csv'],
    outputFile:     'Library.csv',
    allowedFields: [
      'created_at','libId','searchInput','userEmail','type','selectedModel',
      'modelName','hasFiles','uploadedFiles','analyzedFilesCount','processedAt',
    ],
    fieldMap: { lib_id: 'libId' },
  },
  {
    key:            'Chats',
    fileCandidates: ['Chats.csv', 'Chats_rows.csv'],
    outputFile:     'Chats.csv',
    allowedFields: [
      'created_at','libId','userSearchInput','searchResult','aiResp','liked',
      'disliked','usedModel','modelApi','analysisType','analyzedFilesCount','processedFiles',
    ],
    fieldMap: { lib_id: 'libId' },
  },
  {
    key:            'ImageGeneration',
    fileCandidates: ['ImageGeneration.csv', 'ImageGeneration_rows.csv'],
    outputFile:     'ImageGeneration.csv',
    allowedFields: [
      'created_at','libId','userEmail','prompt','generatedImagePath',
      'publicUrl','status','model','width','height',
    ],
  },
  {
    key:            'bug_reports',
    fileCandidates: ['bug_reports.csv', 'bug_reports_rows.csv'],
    outputFile:     'bug_reports.csv',
    allowedFields: ['created_at','user_email','title','description','status'],
  },
  {
    key:            'subscriptions',
    fileCandidates: ['subscriptions.csv', 'subscriptions_rows.csv'],
    outputFile:     'subscriptions.csv',
    allowedFields: ['created_at','user_email','plan','status','amount','payment_id','order_id','start_date','end_date'],
    fieldMap: {
      razorpay_subscription_id: 'payment_id',
      razorpay_order_id:        'order_id',
      plan_type:                'plan',
    },
  },
  {
    key:            'usage_logs',
    fileCandidates: ['usage_logs.csv', 'usage_logs_rows.csv'],
    outputFile:     'usage_logs.csv',
    allowedFields: ['created_at','user_id','model','operation_type','credits_consumed','credits_remaining'],
  },
  {
    key:            'mfa_otps',
    fileCandidates: ['mfa_otps.csv', 'mfa_otps_rows.csv'],
    outputFile:     'mfa_otps.csv',
    allowedFields: ['created_at','user_email','mfa_email','otp','used','expires_at'],
  },
  {
    key:            'user_seen_updates',
    fileCandidates: ['user_seen_updates.csv', 'user_seen_updates_rows.csv'],
    outputFile:     'user_seen_updates.csv',
    allowedFields: ['created_at','user_email','update_id','seen_at'],
  },
  {
    key:            'user_subscription_status',
    fileCandidates: ['user_subscription_status.csv', 'user_subscription_status_rows.csv'],
    outputFile:     'user_subscription_status.csv',
    allowedFields: ['created_at','user_email','status','plan'],
  },
  {
    key:            'website_conversations',
    fileCandidates: ['website_conversations.csv', 'website_conversations_rows.csv'],
    outputFile:     'website_conversations.csv',
    allowedFields: ['created_at','project_id','role','content'],
  },
  {
    key:            'website_credit_packages',
    fileCandidates: ['website_credit_packages.csv', 'website_credit_packages_rows.csv'],
    outputFile:     'website_credit_packages.csv',
    allowedFields: ['created_at','name','credits','price','currency','description','is_active','sort_order'],
    fieldMap: { display_name: 'name', price_inr: 'price' },
    defaults: { currency: 'INR' },
  },
  {
    key:            'website_credit_transactions',
    fileCandidates: ['website_credit_transactions.csv', 'website_credit_transactions_rows.csv'],
    outputFile:     'website_credit_transactions.csv',
    allowedFields: ['created_at','user_email','amount','transaction_type','order_id','package_id'],
  },
  {
    key:            'website_images',
    fileCandidates: ['website_images.csv', 'website_images_rows.csv'],
    outputFile:     'website_images.csv',
    allowedFields: ['created_at','project_id','user_email','prompt','image_url','file_id'],
  },
  {
    key:            'website_projects',
    fileCandidates: ['website_projects.csv', 'website_projects_rows.csv'],
    outputFile:     'website_projects.csv',
    allowedFields: ['created_at','user_email','name','description','html_content','is_published','published_url','current_version_id'],
    fieldMap: { project_name: 'name', current_code: 'html_content' },
  },
  {
    key:            'website_user_credits',
    fileCandidates: ['website_user_credits.csv', 'website_user_credits_rows.csv'],
    outputFile:     'website_user_credits.csv',
    allowedFields: ['created_at','user_email','weekly_credits','purchased_credits','week_start_date','is_pro'],
  },
  {
    key:            'website_versions',
    fileCandidates: ['website_versions.csv', 'website_versions_rows.csv'],
    outputFile:     'website_versions.csv',
    allowedFields: ['created_at','project_id','html_content','version_number','description'],
    fieldMap: { code: 'html_content' },
  },
];

function normalizeHeader(h) {
  let key = String(h ?? '').replace(/^\uFEFF/, '').trim().replace(/^"(.+)"$/, '$1').trim();
  const alias = HEADER_ALIASES.get(key.replace(/\s+/g, '').toLowerCase());
  return alias || key;
}

function resolveCsv(candidates) {
  for (const c of candidates) {
    const p = path.join(CSV_DIR, c);
    if (existsSync(p)) return p;
  }
  return null;
}

function processCollection(config) {
  const csvPath = resolveCsv(config.fileCandidates);
  if (!csvPath) {
    // console.log(`  ⚠  Skipping ${config.key} — CSV not found`);
    return;
  }

  let rows;
  try {
    rows = parse(readFileSync(csvPath, 'utf-8'), {
      bom:               true,
      columns:           (headers) => headers.map(normalizeHeader),
      skip_empty_lines:  true,
      trim:              true,
    });
  } catch (e) {
    console.error(`  ✗  Failed to parse ${config.key}: ${e.message}`);
    return;
  }

  const fieldMap = config.fieldMap || {};
  const allowedSet = new Set(config.allowedFields);

  const cleaned = rows.map((row) => {
    // 1. Apply per-collection field renames
    const renamed = {};
    for (const [k, v] of Object.entries(row)) {
      if (STRIP_FIELDS.has(k)) continue;
      const mapped = fieldMap[k] || k;
      renamed[mapped] = v;
    }

    // 2. Apply transformRow if present
    if (typeof config.transformRow === 'function') config.transformRow(renamed);

    // 3. Apply defaults for missing fields
    if (config.defaults) {
      for (const [k, v] of Object.entries(config.defaults)) {
        if (renamed[k] === undefined || renamed[k] === null || renamed[k] === '') {
          renamed[k] = String(v);
        }
      }
    }

    // 4. Keep only allowed fields
    const out = {};
    for (const field of config.allowedFields) {
      const val = renamed[field];
      if (val !== undefined && val !== null && val !== '') {
        out[field] = String(val);
      } else {
        out[field] = '';   // keep column so header is consistent
      }
    }
    return out;
  });

  // Build CSV with exact allowed-field header order
  const header = config.allowedFields;
  const lines  = [header.join(',')];

  for (const row of cleaned) {
    const line = header.map((col) => {
      let v = row[col] ?? '';
      // Strip embedded newlines/carriage returns so every row stays on one line.
      // Appwrite Console's CSV parser does not support RFC-4180 multiline fields.
      v = v.replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ');
      // Quote if contains comma or double-quote
      if (v.includes(',') || v.includes('"')) {
        return '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    });
    lines.push(line.join(','));
  }

  const outPath = path.join(OUT_DIR, config.outputFile);
  writeFileSync(outPath, lines.join('\n'), 'utf-8');
  // console.log(`  ✅  ${config.key}  →  console-ready/${config.outputFile}  (${cleaned.length} rows)`);
}

// console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
// console.log('  Preparing Appwrite Console-ready CSVs');
// console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

for (const config of COLLECTIONS) {
  processCollection(config);
}

// console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
// console.log(`  Done! Import files are in:`);
// console.log(`  database/csv-exports/console-ready/`);
// console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
