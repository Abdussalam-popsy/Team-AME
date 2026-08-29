export type RunKind = 'vc' | 'hiring';
export type RunStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';
export type EntityKind = 'partner' | 'candidate';

export type VcInput = {
  companyDescription: string;
  website?: string;
  stage: string;
  roundSizeUsd: number;
  geography: string;
  sectorTags: string[];
  excludeFirms: string[];
};

export type HiringInput = {
  role: string;
  jobDescription: string;
  seniority: string;
  location: string;
  mustHaves: string[];
  niceToHaves: string[];
  compRangeUsd: [number, number];
};

export type RunInput = VcInput | HiringInput;

/** A single sourced claim. Every value rendered in the UI traces back to one of these. */
export type Evidence = {
  id: string;
  field: string;
  claim: string;
  sourceKind: 'aviato' | 'predictleads' | 'crustdata' | 'tavily' | 'exa' | 'derived';
  sourceUrl?: string;
  snippet?: string;
  retrievedAt: string;
};

export type CheckSizeBasis = 'observed' | 'stated' | 'unknown';

/**
 * Aviato reports the total size of each round a firm participated in, not the
 * firm's own check, so this is round participation — never presented as a check
 * size we did not observe.
 */
export type RoundProfile = {
  medianRoundUsd?: number;
  rangeUsd?: [number, number];
  roundsCounted: number;
  basis: CheckSizeBasis;
};

export type PortfolioOverlap = {
  company: string;
  url?: string;
  why: string;
  amountUsd?: number;
  date?: string;
  conflict: boolean;
};

export type PartnerDetail = {
  partner: { name: string; title: string; linkedinUrl?: string };
  firm: { name: string; website?: string; aviatoId: string };
  stageFit: { stages: string[]; leadsRounds: boolean | 'unknown' };
  roundProfile: RoundProfile;
  portfolioOverlap: PortfolioOverlap[];
  thesis: { summary: string };
  contact?: { email: string; verification: string };
};

export type MustHaveAssessment = {
  requirement: string;
  met: boolean | 'partial';
  evidence: string;
};

export type CandidateDetail = {
  person: { name: string; title: string; company: string; location?: string; links: string[] };
  history: { role: string; company: string; start?: string; end?: string }[];
  mustHaves: MustHaveAssessment[];
  signals: { kind: string; detail: string }[];
  gaps: string[];
  contact?: { email: string; verification: string };
};

export type EntityDetail = PartnerDetail | CandidateDetail;

/** One criterion of a weighted rubric, as scored for a single entity. */
export type RubricScore = {
  criterion: string;
  weight: number;
  score: number;
  reason: string;
  evidenceIds: string[];
};

export type Disqualification = {
  rule: string;
  detail: string;
};

export type ResultRow = {
  id: string;
  runId: string;
  rank: number | null;
  entityKind: EntityKind;
  name: string;
  headline: Record<string, string>;
  detail: EntityDetail;
  score: number | null;
  rubric: RubricScore[];
  scoreReason: string | null;
  disqualified: Disqualification | null;
  draftSubject: string | null;
  draftBody: string | null;
  draftEditedAt: string | null;
  flags: string[];
  evidence: Evidence[];
};

export type RunStep = {
  seq: number;
  name: string;
  status: StepStatus;
  detail: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export type RunSummary = {
  id: string;
  kind: RunKind;
  status: RunStatus;
  label: string;
  spendUsd: number;
  budgetCapUsd: number;
  pilot: boolean;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export type RunDetail = RunSummary & {
  input: RunInput;
  steps: RunStep[];
  rows: ResultRow[];
};

export type ToolCallLog = {
  id: string;
  provider: string;
  tool: string;
  costUsd: number;
  cacheHit: boolean;
  status: string;
  latencyMs: number;
  createdAt: string;
};

export const DEFAULT_BUDGET_USD: Record<RunKind, number> = { vc: 2, hiring: 5 };
