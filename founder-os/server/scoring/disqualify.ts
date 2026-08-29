import type {
  CandidateDetail,
  Disqualification,
  HiringInput,
  PartnerDetail,
  VcInput,
} from '../../shared/types.js';

const STAGE_ALIASES: Record<string, string[]> = {
  'pre-seed': ['pre-seed', 'preseed', 'pre seed'],
  seed: ['seed', 'seed round', 'seed extension'],
  'series a': ['series a', 'seriesa', 'a round'],
  'series b': ['series b', 'seriesb'],
  'series c+': ['series c', 'series d', 'series e', 'growth', 'late stage'],
};

function normalizeStage(raw: string): string | null {
  const s = raw.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(STAGE_ALIASES)) {
    if (aliases.some((a) => s.includes(a))) return canonical;
  }
  return null;
}

/** Stages we treat as close enough to seed that a firm still qualifies. */
const ADJACENT: Record<string, string[]> = {
  'pre-seed': ['pre-seed', 'seed'],
  seed: ['pre-seed', 'seed', 'series a'],
  'series a': ['seed', 'series a', 'series b'],
  'series b': ['series a', 'series b', 'series c+'],
  'series c+': ['series b', 'series c+'],
};

/**
 * Deterministic pass. Runs before any LLM call: a disqualified row is never
 * scored, never drafted, and never sent to a model at all.
 */
export function disqualifyPartner(
  detail: PartnerDetail,
  input: VcInput,
): Disqualification | null {
  const excluded = input.excludeFirms.map((f) => f.toLowerCase().trim()).filter(Boolean);
  if (excluded.some((f) => detail.firm.name.toLowerCase().includes(f))) {
    return { rule: 'excludedFirm', detail: `${detail.firm.name} is on the exclusion list` };
  }

  const target = normalizeStage(input.stage);
  const firmStages = detail.stageFit.stages
    .map(normalizeStage)
    .filter((s): s is string => s !== null);
  if (target && firmStages.length > 0) {
    const ok = ADJACENT[target] ?? [target];
    if (!firmStages.some((s) => ok.includes(s))) {
      return {
        rule: 'stageMismatch',
        detail: `invests at ${detail.stageFit.stages.join(', ')}, not ${input.stage}`,
      };
    }
  }

  const conflict = detail.portfolioOverlap.find((p) => p.conflict);
  if (conflict) {
    return {
      rule: 'portfolioConflict',
      detail: `already backs ${conflict.company}, a direct competitor`,
    };
  }

  // An order-of-magnitude round-size mismatch is not judgement, it's arithmetic.
  const { medianRoundUsd, basis, roundsCounted } = detail.roundProfile;
  if (basis === 'observed' && roundsCounted >= 3 && medianRoundUsd && medianRoundUsd > 0) {
    if (medianRoundUsd / input.roundSizeUsd > 10) {
      return {
        rule: 'roundSizeMismatch',
        detail:
          `median round they join is $${Math.round(medianRoundUsd / 1_000_000)}M, ` +
          `>10x the $${(input.roundSizeUsd / 1_000_000).toFixed(1)}M round`,
      };
    }
  }

  return null;
}

const US_REMOTE_OK = ['remote', 'united states', 'usa', 'u.s.'];

function locationCompatible(candidate: string | undefined, required: string): boolean {
  if (!candidate) return true; // Unknown location is a gap, not a disqualifier.
  const c = candidate.toLowerCase();
  const r = required.toLowerCase();
  if (!r.includes('remote') && !r.includes('united states') && !r.includes('us')) {
    return c.includes(r);
  }
  if (US_REMOTE_OK.some((t) => c.includes(t))) return true;
  // Any US state abbreviation or well-known US metro suffix.
  return /,\s*(a[klrz]|c[aot]|d[ce]|fl|ga|hi|i[adln]|k[sy]|la|m[adeinost]|n[cdehjmvy]|o[hkr]|pa|ri|s[cd]|t[nx]|ut|v[at]|w[aivy])\b/.test(
    c,
  );
}

export function disqualifyCandidate(
  detail: CandidateDetail,
  input: HiringInput,
): Disqualification | null {
  if (!locationCompatible(detail.person.location, input.location)) {
    return {
      rule: 'locationMismatch',
      detail: `${detail.person.location} is outside ${input.location}`,
    };
  }

  const unmet = detail.mustHaves.filter((m) => m.met === false);
  if (unmet.length > 0) {
    return {
      rule: 'missingMustHave',
      detail: `does not meet: ${unmet.map((m) => m.requirement).join('; ')}`,
    };
  }

  const assessed = new Set(detail.mustHaves.map((m) => m.requirement.toLowerCase()));
  const unassessed = input.mustHaves.filter((m) => !assessed.has(m.toLowerCase()));
  if (unassessed.length === input.mustHaves.length && input.mustHaves.length > 0) {
    return {
      rule: 'noMustHaveEvidence',
      detail: 'no evidence found for any required qualification',
    };
  }

  return null;
}
