import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import type {
  Disqualification,
  EntityDetail,
  EntityKind,
  Evidence,
  ResultRow,
  RubricScore,
  RunDetail,
  RunInput,
  RunKind,
  RunStatus,
  RunStep,
  RunSummary,
  StepStatus,
  ToolCallLog,
} from '../shared/types.js';
import { enforceFieldCitations } from './scoring/evidence-gate.js';

export function createRun(args: {
  kind: RunKind;
  label: string;
  input: RunInput;
  budgetCapUsd: number;
  pilot: boolean;
}): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO run (id, kind, status, label, input_json, budget_usd_cap, pilot)
     VALUES (?, ?, 'queued', ?, ?, ?, ?)`,
  ).run(id, args.kind, args.label, JSON.stringify(args.input), args.budgetCapUsd, args.pilot ? 1 : 0);
  return id;
}

export function setRunStatus(runId: string, status: RunStatus, error?: string): void {
  const finished = status === 'done' || status === 'failed' || status === 'cancelled';
  db.prepare(
    `UPDATE run SET status = ?, error = ?, finished_at = ${finished ? "datetime('now')" : 'finished_at'}
     WHERE id = ?`,
  ).run(status, error ?? null, runId);
}

export function isCancelled(runId: string): boolean {
  const row = db.prepare('SELECT status FROM run WHERE id = ?').get(runId) as
    | { status: RunStatus }
    | undefined;
  return row?.status === 'cancelled';
}

export function upsertStep(
  runId: string,
  seq: number,
  name: string,
  status: StepStatus,
  detail?: string,
): void {
  db.prepare(
    `INSERT INTO run_step (run_id, seq, name, status, detail, started_at, finished_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), NULL)
     ON CONFLICT(run_id, seq) DO UPDATE SET
       status = excluded.status,
       detail = COALESCE(excluded.detail, run_step.detail),
       finished_at = CASE WHEN excluded.status IN ('done','failed','skipped')
                          THEN datetime('now') ELSE run_step.finished_at END`,
  ).run(runId, seq, name, status, detail ?? null);
}

export function saveRow(args: {
  runId: string;
  entityKind: EntityKind;
  name: string;
  headline: Record<string, string>;
  detail: EntityDetail;
  evidence: Omit<Evidence, 'id' | 'retrievedAt'>[] | Evidence[];
  score: number | null;
  rubric: RubricScore[];
  scoreReason: string | null;
  disqualified: Disqualification | null;
  draftSubject: string | null;
  draftBody: string | null;
  flags: string[];
}): { rowId: string; droppedFields: string[] } {
  const rowId = randomUUID();
  const evidence: Evidence[] = args.evidence.map((e, i) => ({
    id: 'id' in e && e.id ? e.id : `E${i + 1}`,
    retrievedAt: 'retrievedAt' in e && e.retrievedAt ? e.retrievedAt : new Date().toISOString(),
    field: e.field,
    claim: e.claim,
    sourceKind: e.sourceKind,
    sourceUrl: e.sourceUrl,
    snippet: e.snippet,
  }));

  // Field-level citation enforcement happens here, on the write path, so an
  // uncited value can never be persisted or rendered.
  const { detail, dropped } = enforceFieldCitations(args.detail, evidence);
  const flags =
    dropped.length > 0
      ? [...args.flags, `uncited, shown as unknown: ${dropped.slice(0, 4).join(', ')}`]
      : args.flags;

  db.prepare(
    `INSERT INTO result_row
       (id, run_id, rank, entity_kind, name, headline_json, detail_json, score, rubric_json,
        score_reason, disqualified_json, draft_subject, draft_body, flags_json)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    rowId,
    args.runId,
    args.entityKind,
    args.name,
    JSON.stringify(args.headline),
    JSON.stringify(detail),
    args.score,
    JSON.stringify(args.rubric),
    args.scoreReason,
    args.disqualified ? JSON.stringify(args.disqualified) : null,
    args.draftSubject,
    args.draftBody,
    JSON.stringify(flags),
  );

  const insertEvidence = db.prepare(
    `INSERT INTO evidence (id, result_row_id, field, claim, source_kind, source_url, snippet, retrieved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const e of evidence) {
    insertEvidence.run(
      `${rowId}:${e.id}`,
      rowId,
      e.field,
      e.claim,
      e.sourceKind,
      e.sourceUrl ?? null,
      e.snippet ?? null,
      e.retrievedAt,
    );
  }

  return { rowId, droppedFields: dropped };
}

/**
 * Writes the scoring/drafting result onto an already-saved row. Extra flags are
 * merged, never assigned, so the citation-gate flags added at insert survive.
 */
export function finalizeRow(
  rowId: string,
  args: {
    score: number;
    rubric: RubricScore[];
    scoreReason: string;
    draftSubject: string;
    draftBody: string;
    extraFlags: string[];
  },
): void {
  const existing = db.prepare('SELECT flags_json FROM result_row WHERE id = ?').get(rowId) as
    | { flags_json: string }
    | undefined;
  const current: string[] = existing ? (JSON.parse(existing.flags_json) as string[]) : [];
  const flags = [...new Set([...current, ...args.extraFlags])];
  db.prepare(
    `UPDATE result_row SET score = ?, rubric_json = ?, score_reason = ?,
       draft_subject = ?, draft_body = ?, flags_json = ? WHERE id = ?`,
  ).run(
    args.score,
    JSON.stringify(args.rubric),
    args.scoreReason,
    args.draftSubject,
    args.draftBody,
    JSON.stringify(flags),
    rowId,
  );
}

/** Ranks scored rows; disqualified rows keep rank NULL and sort last in the UI. */
export function rankRows(runId: string): void {
  const rows = db
    .prepare(
      `SELECT id FROM result_row
       WHERE run_id = ? AND disqualified_json IS NULL AND score IS NOT NULL
       ORDER BY score DESC`,
    )
    .all(runId) as { id: string }[];
  const update = db.prepare('UPDATE result_row SET rank = ? WHERE id = ?');
  rows.forEach((r, i) => update.run(i + 1, r.id));
}

export function updateDraft(rowId: string, subject: string, body: string): boolean {
  const res = db
    .prepare(
      `UPDATE result_row SET draft_subject = ?, draft_body = ?, draft_edited_at = datetime('now')
       WHERE id = ?`,
    )
    .run(subject, body, rowId);
  return res.changes > 0;
}

export function setRowContact(
  rowId: string,
  contact: { email: string; verification: string },
): void {
  const row = db.prepare('SELECT detail_json FROM result_row WHERE id = ?').get(rowId) as
    | { detail_json: string }
    | undefined;
  if (!row) return;
  const detail = JSON.parse(row.detail_json) as Record<string, unknown>;
  detail.contact = contact;
  db.prepare('UPDATE result_row SET detail_json = ? WHERE id = ?').run(
    JSON.stringify(detail),
    rowId,
  );
  db.prepare(
    `INSERT INTO evidence (id, result_row_id, field, claim, source_kind, source_url, snippet)
     VALUES (?, ?, 'contact', ?, 'derived', NULL, NULL)`,
  ).run(`${rowId}:contact`, rowId, `email resolved (${contact.verification})`);
}

type RunRow = {
  id: string;
  kind: RunKind;
  status: RunStatus;
  label: string;
  input_json: string;
  budget_usd_cap: number;
  spend_usd: number;
  pilot: number;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};

function toSummary(r: RunRow): RunSummary {
  return {
    id: r.id,
    kind: r.kind,
    status: r.status,
    label: r.label,
    spendUsd: r.spend_usd,
    budgetCapUsd: r.budget_usd_cap,
    pilot: r.pilot === 1,
    error: r.error,
    createdAt: r.created_at,
    finishedAt: r.finished_at,
  };
}

export function listRuns(): RunSummary[] {
  const rows = db
    .prepare('SELECT * FROM run ORDER BY created_at DESC LIMIT 100')
    .all() as RunRow[];
  return rows.map(toSummary);
}

type ResultRowRecord = {
  id: string;
  run_id: string;
  rank: number | null;
  entity_kind: EntityKind;
  name: string;
  headline_json: string;
  detail_json: string;
  score: number | null;
  rubric_json: string;
  score_reason: string | null;
  disqualified_json: string | null;
  draft_subject: string | null;
  draft_body: string | null;
  draft_edited_at: string | null;
  flags_json: string;
};

type EvidenceRecord = {
  id: string;
  result_row_id: string;
  field: string;
  claim: string;
  source_kind: Evidence['sourceKind'];
  source_url: string | null;
  snippet: string | null;
  retrieved_at: string;
};

export function getRun(runId: string): RunDetail | null {
  const r = db.prepare('SELECT * FROM run WHERE id = ?').get(runId) as RunRow | undefined;
  if (!r) return null;

  const steps = db
    .prepare('SELECT seq, name, status, detail, started_at, finished_at FROM run_step WHERE run_id = ? ORDER BY seq')
    .all(runId) as {
    seq: number;
    name: string;
    status: StepStatus;
    detail: string | null;
    started_at: string | null;
    finished_at: string | null;
  }[];

  const rowRecords = db
    .prepare(
      `SELECT * FROM result_row WHERE run_id = ?
       ORDER BY (rank IS NULL), rank ASC, score DESC`,
    )
    .all(runId) as ResultRowRecord[];

  const evidenceRecords = db
    .prepare(
      `SELECT e.* FROM evidence e JOIN result_row r ON r.id = e.result_row_id
       WHERE r.run_id = ?`,
    )
    .all(runId) as EvidenceRecord[];

  const evidenceByRow = new Map<string, Evidence[]>();
  for (const e of evidenceRecords) {
    const list = evidenceByRow.get(e.result_row_id) ?? [];
    list.push({
      id: e.id.includes(':') ? e.id.slice(e.id.indexOf(':') + 1) : e.id,
      field: e.field,
      claim: e.claim,
      sourceKind: e.source_kind,
      sourceUrl: e.source_url ?? undefined,
      snippet: e.snippet ?? undefined,
      retrievedAt: e.retrieved_at,
    });
    evidenceByRow.set(e.result_row_id, list);
  }

  const rows: ResultRow[] = rowRecords.map((row) => ({
    id: row.id,
    runId: row.run_id,
    rank: row.rank,
    entityKind: row.entity_kind,
    name: row.name,
    headline: JSON.parse(row.headline_json) as Record<string, string>,
    detail: JSON.parse(row.detail_json) as EntityDetail,
    score: row.score,
    rubric: JSON.parse(row.rubric_json) as RubricScore[],
    scoreReason: row.score_reason,
    disqualified: row.disqualified_json
      ? (JSON.parse(row.disqualified_json) as Disqualification)
      : null,
    draftSubject: row.draft_subject,
    draftBody: row.draft_body,
    draftEditedAt: row.draft_edited_at,
    flags: JSON.parse(row.flags_json) as string[],
    evidence: evidenceByRow.get(row.id) ?? [],
  }));

  const steps2: RunStep[] = steps.map((s) => ({
    seq: s.seq,
    name: s.name,
    status: s.status,
    detail: s.detail,
    startedAt: s.started_at,
    finishedAt: s.finished_at,
  }));

  return {
    ...toSummary(r),
    input: JSON.parse(r.input_json) as RunInput,
    steps: steps2,
    rows,
  };
}

export function getRowsByIds(runId: string, rowIds: string[]): ResultRow[] {
  const run = getRun(runId);
  if (!run) return [];
  const wanted = new Set(rowIds);
  return run.rows.filter((r) => wanted.has(r.id));
}

export function listToolCalls(runId: string): ToolCallLog[] {
  const rows = db
    .prepare(
      `SELECT id, provider, tool, cost_usd, cache_hit, status, latency_ms, created_at
       FROM tool_call WHERE run_id = ? ORDER BY created_at`,
    )
    .all(runId) as {
    id: string;
    provider: string;
    tool: string;
    cost_usd: number;
    cache_hit: number;
    status: string;
    latency_ms: number;
    created_at: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    tool: r.tool,
    costUsd: r.cost_usd,
    cacheHit: r.cache_hit === 1,
    status: r.status,
    latencyMs: r.latency_ms,
    createdAt: r.created_at,
  }));
}
