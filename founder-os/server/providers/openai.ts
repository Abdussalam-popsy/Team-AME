import OpenAI from 'openai';
import { assertWithinDeadline, recordToolCall } from '../budget.js';
import { cacheKey, readCache, writeCache } from '../cache.js';
import { ProviderError, type CallOptions } from './deepline.js';

const MODEL = 'gpt-4.1';
/** Published gpt-4.1 pricing, USD per token. */
const IN_USD = 2 / 1_000_000;
const OUT_USD = 8 / 1_000_000;
const TIMEOUT_MS = 45_000;

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new ProviderError('OPENAI_API_KEY is not set', false);
  // One retry on transient errors, bounded per-request timeout: a slow model
  // call must not be able to stall a run.
  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 1,
    timeout: TIMEOUT_MS,
  });
  return client;
}

type JsonSchema = Record<string, unknown>;

/**
 * One structured-output call. Model output is cached by prompt identity, so a
 * re-opened run replays for $0 and a re-run only pays for genuinely new rows.
 */
export async function completeJson<T>(
  tool: string,
  args: { system: string; user: string; schema: JsonSchema; schemaName: string },
  opts: CallOptions,
): Promise<T> {
  const request = { model: MODEL, system: args.system, user: args.user, schema: args.schemaName };
  const ck = cacheKey('openai', tool, request);

  if (!opts.forceRefresh) {
    const hit = readCache<T>(ck);
    if (hit) {
      recordToolCall({
        runId: opts.runId,
        provider: 'openai',
        tool,
        request: { schema: args.schemaName },
        response: undefined,
        costUsd: 0,
        cacheHit: true,
        status: 'cache_hit',
        latencyMs: 0,
      });
      return hit.value;
    }
  }

  if (opts.runId) assertWithinDeadline(opts.runId);

  const started = Date.now();
  try {
    const res = await openai().chat.completions.create(
      {
        model: MODEL,
        temperature: 0.2,
        messages: [
          { role: 'system', content: args.system },
          { role: 'user', content: args.user },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: args.schemaName, strict: true, schema: args.schema },
        },
      },
      { timeout: opts.timeoutMs ?? TIMEOUT_MS },
    );

    const usage = res.usage;
    const costUsd =
      (usage?.prompt_tokens ?? 0) * IN_USD + (usage?.completion_tokens ?? 0) * OUT_USD;
    const content = res.choices[0]?.message?.content;
    if (!content) throw new ProviderError('openai: empty completion', true);
    const parsed = JSON.parse(content) as T;

    recordToolCall({
      runId: opts.runId,
      provider: 'openai',
      tool,
      request: { schema: args.schemaName, tokens: usage?.total_tokens ?? 0 },
      response: parsed,
      costUsd,
      cacheHit: false,
      status: 'ok',
      latencyMs: Date.now() - started,
    });
    writeCache(ck, 'openai', tool, parsed, costUsd);
    return parsed;
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    recordToolCall({
      runId: opts.runId,
      provider: 'openai',
      tool,
      request: { schema: args.schemaName },
      response: { message: err instanceof Error ? err.message : String(err) },
      costUsd: 0,
      cacheHit: false,
      status: 'exception',
      latencyMs: Date.now() - started,
    });
    throw new ProviderError(
      `openai: ${err instanceof Error ? err.message : String(err)}`,
      true,
    );
  }
}
