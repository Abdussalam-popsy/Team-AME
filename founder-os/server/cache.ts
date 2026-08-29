import { createHash } from 'node:crypto';
import { db } from './db.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Locked TTLs, keyed by cache class. */
export const TTL_MS = {
  entityResolution: 30 * DAY,
  portfolio: 7 * DAY,
  peopleSearch: 24 * HOUR,
  research: 7 * DAY,
  verifiedEmail: 30 * DAY,
  /** Model output is cached per row until an explicit regenerate. */
  model: null,
} as const;

export type CacheClass = keyof typeof TTL_MS;

/** Per-tool cache class. Anything unmapped falls back to `research`. */
const TOOL_CLASS: Record<string, CacheClass> = {
  aviato_company_search: 'entityResolution',
  aviato_get_company_founders: 'entityResolution',
  crustdata_v3_person_enrich: 'entityResolution',
  aviato_get_company_outbound_investments: 'portfolio',
  aviato_person_get_company_investments: 'portfolio',
  aviato_get_company_funding_rounds: 'portfolio',
  aviato_get_company_funds: 'portfolio',
  predictleads_discover_portfolio_company_connections: 'portfolio',
  predictleads_company_financing_events: 'portfolio',
  crustdata_v3_person_search: 'peopleSearch',
  peopledatalabs_person_search: 'peopleSearch',
  harvestapi_search_leads: 'peopleSearch',
  exa_people_search: 'peopleSearch',
  exa_search: 'research',
  tavily_search: 'research',
  peopledatalabs_enrich_contact: 'verifiedEmail',
  openai_score: 'model',
  openai_draft: 'model',
};

export function cacheClassFor(tool: string): CacheClass {
  return TOOL_CLASS[tool] ?? 'research';
}

/** Stable stringify so key order in the request object can't change the hash. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
}

/** Normalizes free-text identity inputs so trivial differences still hit cache. */
function normalizeInput(input: unknown): unknown {
  if (typeof input === 'string') return input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (Array.isArray(input)) return input.map(normalizeInput);
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = normalizeInput(v);
    }
    return out;
  }
  return input;
}

export function cacheKey(provider: string, tool: string, input: unknown): string {
  const hash = createHash('sha256').update(canonical(normalizeInput(input))).digest('hex');
  return `${provider}:${tool}:${hash.slice(0, 32)}`;
}

type CacheRow = { response_json: string; cost_usd: number };

export function readCache<T>(key: string): { value: T; originalCostUsd: number } | null {
  const row = db
    .prepare(
      `SELECT response_json, cost_usd FROM cache_entry
       WHERE cache_key = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`,
    )
    .get(key) as CacheRow | undefined;
  if (!row) return null;
  return { value: JSON.parse(row.response_json) as T, originalCostUsd: row.cost_usd };
}

export function writeCache(
  key: string,
  provider: string,
  tool: string,
  value: unknown,
  costUsd: number,
): void {
  const ttl = TTL_MS[cacheClassFor(tool)];
  const expiresAt = ttl === null ? null : new Date(Date.now() + ttl).toISOString();
  db.prepare(
    `INSERT INTO cache_entry (cache_key, provider, tool, response_json, cost_usd, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       response_json = excluded.response_json,
       cost_usd = excluded.cost_usd,
       created_at = datetime('now'),
       expires_at = excluded.expires_at`,
  ).run(key, provider, tool, JSON.stringify(value), costUsd, expiresAt);
}

export function invalidate(key: string): void {
  db.prepare('DELETE FROM cache_entry WHERE cache_key = ?').run(key);
}
