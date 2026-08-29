import type { RunKind } from './types.js';

export type RubricCriterion = {
  key: string;
  label: string;
  /** Weights within a workflow sum to 1. */
  weight: number;
  /** Shown to the model verbatim so rationale maps back to the criterion. */
  guidance: string;
};

/**
 * Weighted rubrics. Hard disqualifiers are not criteria — they run
 * deterministically in server/scoring/disqualify.ts before any model call.
 */
export const RUBRICS: Record<RunKind, RubricCriterion[]> = {
  vc: [
    {
      key: 'roundSizeFit',
      label: 'Round size fit',
      weight: 0.3,
      guidance:
        'Compare the observed median/range of the ROUND TOTALS this firm participates in against ' +
        'the round being raised. This is round size, not their check — never describe it as a ' +
        'check size. 5 = our round sits inside the observed range and near the median. ' +
        '3 = adjacent (within 2x either way). 1 = order-of-magnitude mismatch. ' +
        'If basis is "unknown", score 2 and say so — do not guess.',
    },
    {
      key: 'portfolioOverlap',
      label: 'Portfolio overlap',
      weight: 0.3,
      guidance:
        'Count adjacent (not competing) portfolio companies. Investments dated within the last ' +
        '24 months count double. 5 = 3+ recent adjacent bets. 3 = 1-2, or older ones. ' +
        '1 = no relevant overlap. Name the companies you counted.',
    },
    {
      key: 'thesisOverlap',
      label: 'Thesis language overlap',
      weight: 0.25,
      guidance:
        'Compare the partner\'s own stated thesis language against the company description. ' +
        'Reward concrete overlap (their words about logistics/vertical SaaS/ops software), not ' +
        'generic enthusiasm for AI. 1 if their thesis is only inferred from portfolio.',
    },
    {
      key: 'geoRoundFit',
      label: 'Geography & round fit',
      weight: 0.15,
      guidance:
        'Does the firm invest in this geography and lead rounds of this size? ' +
        'Score 5 if they demonstrably lead comparable rounds in-region.',
    },
  ],
  hiring: [
    {
      key: 'languageDepth',
      label: 'Rust/Go backend depth',
      weight: 0.3,
      guidance:
        'Depth of production backend work in Rust or Go specifically. 5 = multiple years shipping ' +
        'core services in one of them. 3 = used it alongside a primary language. ' +
        '1 = adjacent language only (evidence must name the language).',
    },
    {
      key: 'earlyStage',
      label: 'Early-stage experience',
      weight: 0.25,
      guidance:
        'Time at pre-seed through Series A companies, weighted toward roles where they built ' +
        'something foundational. 5 = founding/first-engineer at an early startup.',
    },
    {
      key: 'domain',
      label: 'Logistics / supply chain domain',
      weight: 0.2,
      guidance:
        'Direct logistics, fleet, dispatch, freight or supply-chain work. 1 if none — this is a ' +
        'nice-to-have, so absence should not sink an otherwise strong candidate.',
    },
    {
      key: 'systemsDepth',
      label: 'Distributed systems / optimization',
      weight: 0.15,
      guidance:
        'Routing, scheduling, solver, or large-scale distributed systems work. ' +
        'Cite the specific system or project.',
    },
    {
      key: 'signals',
      label: 'Timing & reachability signals',
      weight: 0.1,
      guidance:
        'Recent job change (long tenure without a change scores higher for receptivity), ' +
        'public open-source activity, conference talks. Score 3 when no signals are available.',
    },
  ],
};

export function weightedTotal(
  scores: { weight: number; score: number }[],
): number {
  if (scores.length === 0) return 0;
  const weightSum = scores.reduce((a, s) => a + s.weight, 0);
  if (weightSum === 0) return 0;
  const raw = scores.reduce((a, s) => a + s.weight * s.score, 0) / weightSum;
  return Math.round((raw / 5) * 100);
}
