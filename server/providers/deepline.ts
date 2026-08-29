import { assertWithinBudget, assertWithinDeadline, recordToolCall } from '../budget.js';
import { cacheKey, readCache, writeCache } from '../cache.js';

const BASE = 'https://code.deepline.com';
/** Provider searches are the slowest calls we make, but not minutes-slow. */
const TIMEOUT_MS = 60_000;

/**
 * Verified unit costs (USD), used only for the pre-flight budget estimate; the
 * amount actually billed comes back on `billing.cost_usd` and is what we record.
 */
const COST_ESTIMATE_USD: Record<string, number> = {
  aviato_company_search: 0.004,
  aviato_get_company_outbound_investments: 0.014,
  aviato_person_get_company_investments: 0.014,
  aviato_get_company_founders: 0.004,
  aviato_get_company_funding_rounds: 0.014,
  crustdata_v3_person_search: 0.05,
  crustdata_v3_person_enrich: 0.01,
  harvestapi_search_leads: 0.07,
  peopledatalabs_person_search: 0.02,
  peopledatalabs_enrich_contact: 0.02,
  predictleads_discover_portfolio_company_connections: 0.05,
  predictleads_company_financing_events: 0.05,
  exa_search: 0.02,
  exa_people_search: 0.05,
};

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

type ExecuteResponse = {
  job_id?: string;
  status?: string;
  result?: { data?: unknown };
  error?: string;
  message?: string;
  billing?: { credits_charged?: number; cost_usd?: number };
};

function apiKey(): string {
  const key = process.env.DEEPLINE_API_KEY;
  if (!key) throw new ProviderError('DEEPLINE_API_KEY is not set', false);
  return key;
}

export type CallOptions = {
  runId: string | null;
  forceRefresh?: boolean;
  timeoutMs?: number;
};

/**
 * Executes one Deepline-managed provider tool. Cache is checked first, so a
 * repeat lookup inside its TTL never re-bills and can never trip the budget.
 */
export async function callDeepline<T = unknown>(
  tool: string,
  payload: Record<string, unknown>,
  opts: CallOptions,
): Promise<{ data: T; costUsd: number; cacheHit: boolean }> {
  const key = cacheKey('deepline', tool, payload);

  if (!opts.forceRefresh) {
    const hit = readCache<T>(key);
    if (hit) {
      recordToolCall({
        runId: opts.runId,
        provider: 'deepline',
        tool,
        request: payload,
        response: undefined,
        costUsd: 0,
        cacheHit: true,
        status: 'cache_hit',
        latencyMs: 0,
      });
      return { data: hit.value, costUsd: 0, cacheHit: true };
    }
  }

  const estimate = COST_ESTIMATE_USD[tool] ?? 0.05;
  if (opts.runId) {
    assertWithinDeadline(opts.runId);
    assertWithinBudget(opts.runId, tool, estimate);
  }

  const started = Date.now();
  let attempt = 0;
  // One retry, transient failures only.
  for (;;) {
    attempt += 1;
    try {
      const res = await fetch(`${BASE}/api/v2/integrations/${tool}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? TIMEOUT_MS),
      });

      const body = (await res.json()) as ExecuteResponse;
      const costUsd = body.billing?.cost_usd ?? 0;

      if (!res.ok || body.status === 'failed' || body.error) {
        const retryable = res.status >= 500 || res.status === 429;
        recordToolCall({
          runId: opts.runId,
          provider: 'deepline',
          tool,
          request: payload,
          response: body,
          costUsd,
          cacheHit: false,
          status: `error_${res.status}`,
          latencyMs: Date.now() - started,
        });
        const msg = body.error ?? body.message ?? `HTTP ${res.status}`;
        if (retryable && attempt < 2) continue;
        throw new ProviderError(`${tool}: ${msg}`, retryable);
      }

      const data = (body.result?.data ?? null) as T;
      recordToolCall({
        runId: opts.runId,
        provider: 'deepline',
        tool,
        request: payload,
        response: data,
        costUsd,
        cacheHit: false,
        status: 'ok',
        latencyMs: Date.now() - started,
      });
      writeCache(key, 'deepline', tool, data, costUsd);
      return { data, costUsd, cacheHit: false };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const transient =
        err instanceof Error && /timeout|fetch failed|ECONNRESET|aborted/i.test(err.message);
      if (transient && attempt < 2) continue;
      recordToolCall({
        runId: opts.runId,
        provider: 'deepline',
        tool,
        request: payload,
        response: { message: err instanceof Error ? err.message : String(err) },
        costUsd: 0,
        cacheHit: false,
        status: 'exception',
        latencyMs: Date.now() - started,
      });
      throw new ProviderError(
        `${tool}: ${err instanceof Error ? err.message : String(err)}`,
        transient,
      );
    }
  }
}

/* ---------- Typed wrappers for the tools the pipelines actually use ---------- */

export type AviatoCompany = {
  id: string;
  name: string;
  country?: string;
  region?: string;
  locality?: string;
  URLs?: Record<string, string>;
  industryList?: string[];
};

export async function aviatoCompanySearch(
  name: string,
  opts: CallOptions,
  limit = 5,
): Promise<AviatoCompany[]> {
  const { data } = await callDeepline<{ items?: AviatoCompany[]; count?: unknown }>(
    'aviato_company_search',
    { dsl: { offset: 0, limit, filters: [{ name: { operation: 'textcontains', value: name } }] } },
    opts,
  );
  return data?.items ?? [];
}

export type AviatoInvestment = {
  id: number;
  totalAmountRaised?: number;
  date?: string;
  companyID?: string;
  company?: {
    id: string;
    name: string;
    description?: string;
    country?: string;
    region?: string;
    locality?: string;
    URLs?: Record<string, string>;
    industryList?: string[];
  };
};

export async function aviatoOutboundInvestments(
  aviatoId: string,
  opts: CallOptions,
  perPage = 25,
): Promise<AviatoInvestment[]> {
  const { data } = await callDeepline<{ investments?: AviatoInvestment[] }>(
    'aviato_get_company_outbound_investments',
    { id: aviatoId, perPage, page: 0 },
    opts,
  );
  return data?.investments ?? [];
}

/** Crustdata v3 employment entry. `company_headcount_latest` is our early-stage signal. */
export type CrustdataEmployment = {
  name?: string;
  company_name?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  seniority_level?: string;
  function_category?: string;
  company_headcount_latest?: number;
  company_headcount_range?: string;
  company_industries?: string[];
  company_website?: string;
  company_professional_network_profile_url?: string;
};

/**
 * Shape verified against the live /person/search response. Skills, summaries and
 * role descriptions are NOT returned on this account's field allowlist, so
 * anything requiring them has to be sourced from public research instead.
 */
export type CrustdataPerson = {
  crustdata_person_id?: number;
  basic_profile?: {
    name?: string;
    current_title?: string;
    headline?: string;
    location?: {
      full_location?: string;
      city?: string;
      state?: string;
      country?: string;
    };
    normalized_title?: { matched_title?: string; department?: string; sub_department?: string };
  };
  experience?: {
    employment_details?: {
      current?: CrustdataEmployment[];
      past?: CrustdataEmployment[];
    };
  };
  education?: { schools?: { school?: string; degree?: string; end_year?: number }[] };
  social_handles?: {
    professional_network_identifier?: { profile_url?: string | null };
    dev_platform_identifier?: { profile_url?: string | null };
    twitter_identifier?: { slug?: string };
  };
};

export type PersonSearchCondition = {
  field: string;
  type: string;
  value: string | number | boolean | (string | number)[];
};

export type PersonSearchFilters =
  | PersonSearchCondition
  | { op: 'and' | 'or' | 'all_of'; conditions: (PersonSearchCondition | PersonSearchFilters)[] };

/**
 * Fields the account is actually allowed to select. `skills` and
 * `recently_changed_jobs` are rejected with a 400, and `years_of_experience`
 * with a 403, so they are deliberately absent.
 */
const PERSON_FIELDS = [
  'basic_profile',
  'experience',
  'education',
  'social_handles',
  'contact',
  'metadata',
];

export async function crustdataPersonSearch(
  args: { filters: PersonSearchFilters; limit: number },
  opts: CallOptions,
): Promise<CrustdataPerson[]> {
  const { data } = await callDeepline<{ profiles?: CrustdataPerson[] }>(
    'crustdata_v3_person_search',
    { filters: args.filters, limit: args.limit, fields: PERSON_FIELDS },
    opts,
  );
  return data?.profiles ?? [];
}

/** Finalists only — never called for the full pool. */
export async function resolveEmail(
  person: { firstName?: string; lastName?: string; company?: string; domain?: string; linkedinUrl?: string },
  opts: CallOptions,
): Promise<{ email?: string; verification: string }> {
  const { data } = await callDeepline<{
    email?: string;
    emails?: { address?: string; email?: string; verification?: string }[];
    verification?: string;
    status?: string;
  }>(
    'peopledatalabs_enrich_contact',
    {
      first_name: person.firstName,
      last_name: person.lastName,
      company: person.company,
      profile: person.linkedinUrl,
    },
    opts,
  );
  const email = data?.email ?? data?.emails?.[0]?.address ?? data?.emails?.[0]?.email;
  return { email, verification: data?.verification ?? data?.status ?? 'unverified' };
}
