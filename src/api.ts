import type { RunDetail, RunKind, RunSummary, ToolCallLog } from '../shared/types.js';
import type { RubricCriterion } from '../shared/rubric.js';

export type RunDetailResponse = RunDetail & {
  toolCalls: ToolCallLog[];
  remainingUsd: number;
};

export type FinalistResult = {
  rowId: string;
  email?: string;
  verification: string;
  error?: string;
};

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () =>
    json<{ ok: boolean; providers: Record<string, boolean> }>('/api/health'),
  rubrics: () => json<Record<RunKind, RubricCriterion[]>>('/api/rubrics'),
  listRuns: () => json<RunSummary[]>('/api/runs'),
  getRun: (id: string) => json<RunDetailResponse>(`/api/runs/${id}`),
  createRun: (body: {
    kind: RunKind;
    input: unknown;
    pilot: boolean;
    forceRefresh: boolean;
  }) => json<{ runId: string }>('/api/runs', { method: 'POST', body: JSON.stringify(body) }),
  cancelRun: (id: string) => json<{ ok: boolean }>(`/api/runs/${id}/cancel`, { method: 'POST' }),
  resolveFinalists: (id: string, rowIds: string[]) =>
    json<{ results: FinalistResult[]; spendUsd: number }>(`/api/runs/${id}/finalists`, {
      method: 'POST',
      body: JSON.stringify({ rowIds }),
    }),
  saveDraft: (rowId: string, draftSubject: string, draftBody: string) =>
    json<{ ok: boolean }>(`/api/rows/${rowId}`, {
      method: 'PATCH',
      body: JSON.stringify({ draftSubject, draftBody }),
    }),
};

export const usd = (n: number): string => `$${n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}`;

export const money = (n?: number): string =>
  typeof n === 'number' ? `$${Math.round(n / 1000).toLocaleString()}K` : 'unknown';
