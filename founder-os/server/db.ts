import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const dbPath = resolve(process.env.FOUNDER_OS_DB ?? 'data/founder-os.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });

export const db: Database.Database = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS run (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('vc','hiring')),
  status TEXT NOT NULL CHECK(status IN ('queued','running','done','failed','cancelled')),
  label TEXT NOT NULL DEFAULT '',
  input_json TEXT NOT NULL,
  budget_usd_cap REAL NOT NULL,
  spend_usd REAL NOT NULL DEFAULT 0,
  pilot INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS run_step (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','running','done','failed','skipped')),
  detail TEXT,
  started_at TEXT,
  finished_at TEXT,
  UNIQUE(run_id, seq)
);

CREATE TABLE IF NOT EXISTS tool_call (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES run(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  tool TEXT NOT NULL,
  request_json TEXT NOT NULL,
  response_json TEXT,
  cost_usd REAL NOT NULL DEFAULT 0,
  cache_hit INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cache keyed by identity: provider + tool + normalized input hash.
CREATE TABLE IF NOT EXISTS cache_entry (
  cache_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  tool TEXT NOT NULL,
  response_json TEXT NOT NULL,
  cost_usd REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS result_row (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  rank INTEGER,
  entity_kind TEXT NOT NULL CHECK(entity_kind IN ('partner','candidate')),
  name TEXT NOT NULL,
  headline_json TEXT NOT NULL,
  detail_json TEXT NOT NULL,
  score REAL,
  rubric_json TEXT NOT NULL DEFAULT '[]',
  score_reason TEXT,
  disqualified_json TEXT,
  draft_subject TEXT,
  draft_body TEXT,
  draft_edited_at TEXT,
  flags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  result_row_id TEXT NOT NULL REFERENCES result_row(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  claim TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_url TEXT,
  snippet TEXT,
  retrieved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_row_run ON result_row(run_id);
CREATE INDEX IF NOT EXISTS idx_evidence_row ON evidence(result_row_id);
CREATE INDEX IF NOT EXISTS idx_step_run ON run_step(run_id);
CREATE INDEX IF NOT EXISTS idx_tool_call_run ON tool_call(run_id);
`);
