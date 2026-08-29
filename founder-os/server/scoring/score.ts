import { RUBRICS, weightedTotal } from '../../shared/rubric.js';
import type { Evidence, RubricScore, RunKind } from '../../shared/types.js';
import { completeJson } from '../providers/openai.js';
import type { CallOptions } from '../providers/deepline.js';
import { evidenceForPrompt, validateEvidenceIds } from './evidence-gate.js';

const SYSTEM = [
  'You score one entity against a fixed weighted rubric for an early-stage founder.',
  'You are given ONLY numbered evidence entries. They are the complete universe of facts.',
  'Rules you must follow:',
  '1. Score every criterion 1-5 using its stated guidance. Never invent a criterion.',
  '2. Every criterion must cite the evidence IDs it relied on. If no evidence bears on a',
  '   criterion, score it per the guidance\'s no-evidence case and cite nothing.',
  '3. Never assert a fact that is not in the evidence. No inference about people, funds,',
  '   or companies from background knowledge — if it is not in the evidence, it is unknown.',
  '4. Each reason must name the criterion it belongs to and quote or paraphrase the cited',
  '   evidence. Reasons that could be written about any company are failures.',
  '5. The summary must reference the two criteria that moved the score most, by name.',
].join('\n');

type ScoreResponse = {
  criteria: { key: string; score: number; reason: string; evidenceIds: string[] }[];
  summary: string;
};

const SCORE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['criteria', 'summary'],
  properties: {
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'score', 'reason', 'evidenceIds'],
        properties: {
          key: { type: 'string' },
          score: { type: 'integer', minimum: 1, maximum: 5 },
          reason: { type: 'string' },
          evidenceIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    summary: { type: 'string' },
  },
} as const;

export async function scoreEntity(
  kind: RunKind,
  context: { name: string; oneLiner: string; target: string },
  evidence: Evidence[],
  opts: CallOptions,
): Promise<{ score: number; rubric: RubricScore[]; reason: string }> {
  const rubric = RUBRICS[kind];
  const criteriaBlock = rubric
    .map((c) => `- key: ${c.key} | ${c.label} | weight ${Math.round(c.weight * 100)}%\n  ${c.guidance}`)
    .join('\n');

  const user = [
    `We are: ${context.target}`,
    ``,
    `Entity under evaluation: ${context.name} — ${context.oneLiner}`,
    ``,
    `RUBRIC (score each key 1-5):`,
    criteriaBlock,
    ``,
    `EVIDENCE (the only facts you may use):`,
    evidence.length > 0 ? evidenceForPrompt(evidence) : '(none)',
  ].join('\n');

  const out = await completeJson<ScoreResponse>(
    'openai_score',
    { system: SYSTEM, user, schema: SCORE_SCHEMA, schemaName: 'rubric_score' },
    opts,
  );

  const byKey = new Map(out.criteria.map((c) => [c.key, c]));
  const scores: RubricScore[] = rubric.map((c) => {
    const got = byKey.get(c.key);
    return {
      criterion: c.label,
      weight: c.weight,
      score: got ? Math.min(5, Math.max(1, got.score)) : 1,
      reason: got?.reason ?? 'no assessment returned for this criterion',
      evidenceIds: got ? validateEvidenceIds(got.evidenceIds, evidence) : [],
    };
  });

  return { score: weightedTotal(scores), rubric: scores, reason: out.summary };
}

const DRAFT_SYSTEM = [
  'You write one short outreach email on behalf of a founder.',
  'You are given ONLY numbered evidence entries and the rubric reasons already produced.',
  'Rules:',
  '1. Ground every specific claim about the recipient in a cited evidence ID. If you cannot',
  '   cite it, do not write it.',
  '2. Exactly one sentence that is specific to this recipient and could not be sent to anyone',
  '   else. It must come from the evidence.',
  '3. No flattery, no "I hope this finds you well", no "I came across your profile", no',
  '   adjectives about how impressive they are. Under 130 words.',
  '4. Plain sentences. No em dashes, no marketing voice, no exclamation marks.',
  '5. Never state a number (round size, ARR, check size) that is not in the evidence or in',
  '   the sender\'s own description.',
].join('\n');

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['subject', 'body', 'citedEvidenceIds', 'personalizedSentence'],
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' },
    personalizedSentence: { type: 'string' },
    citedEvidenceIds: { type: 'array', items: { type: 'string' } },
  },
} as const;

type DraftResponse = {
  subject: string;
  body: string;
  personalizedSentence: string;
  citedEvidenceIds: string[];
};

/**
 * A draft is only personalized if the body names something true of this specific
 * recipient. `specificTerms` are entity-specific strings pulled from the evidence
 * (firms, portfolio companies, employers), so this is checkable without a model.
 */
function isPersonalized(body: string, specificTerms: string[]): boolean {
  const haystack = body.toLowerCase();
  return specificTerms.some((t) => t.trim().length > 2 && haystack.includes(t.toLowerCase()));
}

export async function draftOutreach(
  kind: RunKind,
  context: { name: string; senderContext: string; ask: string; specificTerms: string[] },
  evidence: Evidence[],
  rubric: RubricScore[],
  opts: CallOptions,
): Promise<{ subject: string; body: string; citedEvidenceIds: string[]; personalized: boolean }> {
  const base = [
    `Sender: ${context.senderContext}`,
    `Recipient: ${context.name}`,
    `Ask: ${context.ask}`,
    kind === 'vc'
      ? 'Tone: founder to investor. Lead with traction, not vision.'
      : 'Tone: founder to engineer. Lead with the problem they would own.',
    ``,
    `WHY THEY RANKED (already assessed, reuse rather than re-argue):`,
    ...rubric.map((r) => `- ${r.criterion}: ${r.score}/5 — ${r.reason}`),
    ``,
    `EVIDENCE (the only facts you may use about the recipient):`,
    evidence.length > 0 ? evidenceForPrompt(evidence) : '(none)',
  ].join('\n');

  let out = await completeJson<DraftResponse>(
    'openai_draft',
    { system: DRAFT_SYSTEM, user: base, schema: DRAFT_SCHEMA, schemaName: 'outreach_draft' },
    opts,
  );

  // One corrective pass when the body could have been sent to anyone. The changed
  // prompt is its own cache identity, so this never re-bills the same request.
  if (!isPersonalized(out.body, context.specificTerms) && context.specificTerms.length > 0) {
    out = await completeJson<DraftResponse>(
      'openai_draft',
      {
        system: DRAFT_SYSTEM,
        user: [
          base,
          ``,
          `REWRITE REQUIREMENT: the previous draft was generic. The body must name at least`,
          `one of these recipient-specific facts verbatim, and cite the evidence ID it came from:`,
          ...context.specificTerms.slice(0, 8).map((t) => `- ${t}`),
        ].join('\n'),
        schema: DRAFT_SCHEMA,
        schemaName: 'outreach_draft',
      },
      opts,
    );
  }

  return {
    subject: out.subject,
    body: out.body,
    citedEvidenceIds: validateEvidenceIds(out.citedEvidenceIds, evidence),
    personalized: isPersonalized(out.body, context.specificTerms),
  };
}
