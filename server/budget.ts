import { randomUUID } from 'node:crypto';
import { db } from './db.js';

export class BudgetExceededError extends Error {
  constructor(
    readonly spendUsd: number,
    readonly capUsd: number,
    readonly attemptedTool: string,
  ) {
    super(
      `budget cap $${capUsd.toFixed(2)} would be exceeded by ${attemptedTool} ` +
        `(spent $${spendUsd.toFixed(4)})`,
    );
    this.name = 'BudgetExceededError';
  }
}

type SpendRow = { spend_usd: number; budget_usd_cap: number };

export function getSpend(runId: string): SpendRow {
  const row = db
    .prepare('SELECT spend_usd, budget_usd_cap FROM run WHERE id = ?')
    .get(runId) as SpendRow | undefined;
  if (!row) throw new Error(`unknown run ${runId}`);
  return row;
}

/**
 * Pre-flight guard. Cache hits pass `estimateUsd: 0` and so can never be
 * blocked — reopening or re-running inside TTL always costs $0.
 */
export function assertWithinBudget(runId: string, tool: string, estimateUsd: number): void {
  if (estimateUsd <= 0) return;
  const { spend_usd, budget_usd_cap } = getSpend(runId);
  if (spend_usd + estimateUsd > budget_usd_cap) {
    throw new BudgetExceededError(spend_usd, budget_usd_cap, tool);
  }
}

export function recordToolCall(args: {
  runId: string | null;
  provider: string;
  tool: string;
  request: unknown;
  response: unknown;
  costUsd: number;
  cacheHit: boolean;
  status: string;
  latencyMs: number;
}): void {
  db.prepare(
    `INSERT INTO tool_call
       (id, run_id, provider, tool, request_json, response_json, cost_usd, cache_hit, status, latency_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    args.runId,
    args.provider,
    args.tool,
    JSON.stringify(args.request),
    args.response === undefined ? null : JSON.stringify(args.response).slice(0, 200_000),
    args.costUsd,
    args.cacheHit ? 1 : 0,
    args.status,
    args.latencyMs,
  );
  if (args.runId && args.costUsd > 0) {
    db.prepare('UPDATE run SET spend_usd = spend_usd + ? WHERE id = ?').run(
      args.costUsd,
      args.runId,
    );
  }
}

export function remainingBudget(runId: string): number {
  const { spend_usd, budget_usd_cap } = getSpend(runId);
  return Math.max(0, budget_usd_cap - spend_usd);
}
