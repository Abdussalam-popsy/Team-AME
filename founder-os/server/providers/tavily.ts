import { assertWithinBudget, assertWithinDeadline, recordToolCall } from '../budget.js';
import { cacheKey, readCache, writeCache } from '../cache.js';
import { ProviderError, type CallOptions } from './deepline.js';

/** Tavily advanced search, billed per call on our plan. */
const COST_PER_SEARCH_USD = 0.008;
const TIMEOUT_MS = 20_000;

export type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
  publishedDate?: string;
};

type TavilyResponse = { results?: TavilyResult[]; answer?: string };

export async function tavilySearch(
  query: string,
  opts: CallOptions & { maxResults?: number; includeDomains?: string[] },
): Promise<TavilyResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new ProviderError('TAVILY_API_KEY is not set', false);

  const request = {
    query,
    search_depth: 'advanced',
    max_results: opts.maxResults ?? 5,
    include_domains: opts.includeDomains ?? [],
  };
  const ck = cacheKey('tavily', 'tavily_search', request);

  if (!opts.forceRefresh) {
    const hit = readCache<TavilyResult[]>(ck);
    if (hit) {
      recordToolCall({
        runId: opts.runId,
        provider: 'tavily',
        tool: 'tavily_search',
        request,
        response: undefined,
        costUsd: 0,
        cacheHit: true,
        status: 'cache_hit',
        latencyMs: 0,
      });
      return hit.value;
    }
  }

  if (opts.runId) {
    assertWithinDeadline(opts.runId);
    assertWithinBudget(opts.runId, 'tavily_search', COST_PER_SEARCH_USD);
  }

  const started = Date.now();
  let attempt = 0;
  // One retry, transient failures only — same policy as the Deepline client.
  for (;;) {
    attempt += 1;
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(opts.timeoutMs ?? TIMEOUT_MS),
      });
      if (!res.ok) {
        const text = await res.text();
        const retryable = res.status >= 500 || res.status === 429;
        recordToolCall({
          runId: opts.runId,
          provider: 'tavily',
          tool: 'tavily_search',
          request,
          response: { text: text.slice(0, 2000) },
          costUsd: 0,
          cacheHit: false,
          status: `error_${res.status}`,
          latencyMs: Date.now() - started,
        });
        if (retryable && attempt < 2) continue;
        throw new ProviderError(`tavily: HTTP ${res.status}`, retryable);
      }
      const body = (await res.json()) as TavilyResponse;
      const results = body.results ?? [];
      recordToolCall({
        runId: opts.runId,
        provider: 'tavily',
        tool: 'tavily_search',
        request,
        response: results,
        costUsd: COST_PER_SEARCH_USD,
        cacheHit: false,
        status: 'ok',
        latencyMs: Date.now() - started,
      });
      writeCache(ck, 'tavily', 'tavily_search', results, COST_PER_SEARCH_USD);
      return results;
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      const transient = /timeout|timed out|fetch failed|ECONNRESET|aborted/i.test(message);
      if (transient && attempt < 2) continue;
      throw new ProviderError(`tavily: ${message}`, transient);
    }
  }
}
