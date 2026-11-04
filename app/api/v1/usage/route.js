import { NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { databases } from '@/services/appwrite-admin.js';
import {
  APPWRITE_DATABASE_ID,
  API_USAGE_LOGS_COLLECTION_ID,
  USERS_COLLECTION_ID,
} from '@/services/appwrite-collections.js';
import { ensureApiUsageStorageReady } from '@/lib/appwrite-api-usage-bootstrap.js';
import {
  AuthError,
  authErrorResponse,
  resolveRequestUserEmail,
} from '@/lib/server-auth.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function toUtcDayKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toUtcMonthKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date) {
  const dayStart = startOfUtcDay(date);
  const day = dayStart.getUTCDay();
  const offset = (day + 6) % 7; // Monday start
  return new Date(dayStart.getTime() - offset * DAY_MS);
}

function toCurrency(value) {
  return Number(Number(value || 0).toFixed(6));
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function getUserIdByEmail(email) {
  const users = await databases.listDocuments(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, [
    Query.equal('email', String(email || '').toLowerCase()),
    Query.limit(1),
  ]);

  return users.documents[0]?.$id || null;
}

async function listUsageLogsByUser(userId, sinceIso) {
  // Ensure the api_usage_logs collection exists before querying it.
  await ensureApiUsageStorageReady();
  const pageSize = 100;
  const maxRows = 5000;
  let offset = 0;
  const allRows = [];

  while (offset < maxRows) {
    const queries = [
      Query.equal('user_id', userId),
      Query.greaterThanEqual('created_at', sinceIso),
      Query.orderDesc('created_at'),
      Query.limit(pageSize),
      Query.offset(offset),
    ];

    const page = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      API_USAGE_LOGS_COLLECTION_ID,
      queries
    );

    const rows = page.documents || [];
    allRows.push(...rows);

    if (rows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return allRows;
}

function createDailyBuckets(now) {
  const points = [];
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(now.getTime() - i * DAY_MS);
    const key = toUtcDayKey(date);
    points.push({
      key,
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      requests: 0,
      tokens: 0,
      cost: 0,
    });
  }
  return points;
}

function createWeeklyBuckets(now) {
  const points = [];
  const currentWeek = startOfUtcWeek(now);

  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(currentWeek.getTime() - i * WEEK_MS);
    const key = toUtcDayKey(date);
    points.push({
      key,
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      requests: 0,
      tokens: 0,
      cost: 0,
    });
  }

  return points;
}

function createMonthlyBuckets(now) {
  const points = [];
  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = toUtcMonthKey(date);
    points.push({
      key,
      label: date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      requests: 0,
      tokens: 0,
      cost: 0,
    });
  }
  return points;
}

function aggregateUsage(logs) {
  const now = new Date();
  const daily = createDailyBuckets(now);
  const weekly = createWeeklyBuckets(now);
  const monthly = createMonthlyBuckets(now);

  const dailyMap = new Map(daily.map((row) => [row.key, row]));
  const weeklyMap = new Map(weekly.map((row) => [row.key, row]));
  const monthlyMap = new Map(monthly.map((row) => [row.key, row]));

  const totals = {
    requests: 0,
    tokens: 0,
    cost: 0,
  };

  const byEndpoint = {
    chat: 0,
    search: 0,
    embeddings: 0,
    other: 0,
  };

  for (const log of logs) {
    const created = new Date(log.created_at || (toNumber(log.timestamp, 0) * 1000));
    if (Number.isNaN(created.getTime())) {
      continue;
    }

    const endpoint = String(log.endpoint || '').toLowerCase();
    if (endpoint === 'chat' || endpoint === 'search' || endpoint === 'embeddings') {
      byEndpoint[endpoint] += 1;
    } else {
      byEndpoint.other += 1;
    }

    const tokens = toNumber(log.total_tokens, 0) || (toNumber(log.prompt_tokens, 0) + toNumber(log.completion_tokens, 0));
    const cost = toNumber(log.credits_consumed, toNumber(log.cost_usd, 0));

    totals.requests += 1;
    totals.tokens += tokens;
    totals.cost += cost;

    const dayKey = toUtcDayKey(created);
    const dayRow = dailyMap.get(dayKey);
    if (dayRow) {
      dayRow.requests += 1;
      dayRow.tokens += tokens;
      dayRow.cost += cost;
    }

    const weekKey = toUtcDayKey(startOfUtcWeek(created));
    const weekRow = weeklyMap.get(weekKey);
    if (weekRow) {
      weekRow.requests += 1;
      weekRow.tokens += tokens;
      weekRow.cost += cost;
    }

    const monthKey = toUtcMonthKey(created);
    const monthRow = monthlyMap.get(monthKey);
    if (monthRow) {
      monthRow.requests += 1;
      monthRow.tokens += tokens;
      monthRow.cost += cost;
    }
  }

  const formatRows = (rows) =>
    rows.map((row) => ({
      ...row,
      cost: toCurrency(row.cost),
    }));

  return {
    totals: {
      requests: totals.requests,
      tokens: totals.tokens,
      cost: toCurrency(totals.cost),
    },
    byEndpoint,
    charts: {
      daily: formatRows(daily),
      weekly: formatRows(weekly),
      monthly: formatRows(monthly),
    },
    generated_at: new Date().toISOString(),
  };
}

export async function GET(request) {
  try {
    const email = await resolveRequestUserEmail(request);
    const userId = await getUserIdByEmail(email);

    if (!userId) {
      return NextResponse.json({ success: true, analytics: aggregateUsage([]) }, { status: 200 });
    }

    const now = new Date();
    const earliestMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const logs = await listUsageLogsByUser(userId, earliestMonth.toISOString());

    return NextResponse.json(
      {
        success: true,
        analytics: aggregateUsage(logs),
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, 'Authentication is required to fetch API usage analytics.');
    }

    console.error('Error fetching API usage analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch usage analytics.',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
