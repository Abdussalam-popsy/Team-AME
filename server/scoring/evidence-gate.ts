import type { Evidence } from '../../shared/types.js';

export const UNKNOWN = 'unknown';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/**
 * Fields that describe the record's own identity rather than a sourced claim.
 * These are set by our own entity-resolution step, which records its own
 * evidence row, so they are never redacted.
 */
const IDENTITY_PREFIXES = ['partner.name', 'firm.name', 'firm.aviatoId', 'person.name'];

function isCited(path: string, fields: Set<string>): boolean {
  if (IDENTITY_PREFIXES.some((p) => path === p || path.startsWith(`${p}.`))) return true;
  for (const field of fields) {
    if (path === field || path.startsWith(`${field}.`)) return true;
  }
  return false;
}

function redact(value: Json, path: string, fields: Set<string>, dropped: string[]): Json {
  if (Array.isArray(value)) {
    const kept: Json[] = [];
    value.forEach((item, i) => {
      const itemPath = `${path}.${i}`;
      if (item !== null && typeof item === 'object') {
        kept.push(redact(item, itemPath, fields, dropped));
      } else if (isCited(itemPath, fields)) {
        kept.push(item);
      } else {
        dropped.push(itemPath);
      }
    });
    return kept;
  }

  if (value !== null && typeof value === 'object') {
    const out: { [k: string]: Json } = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = redact(child, path ? `${path}.${key}` : key, fields, dropped);
    }
    return out;
  }

  // Leaf.
  if (value === null || value === undefined || value === '') return null;
  if (isCited(path, fields)) return value;
  // Already-unknown values are not a citation failure, just missing data.
  if (value === UNKNOWN) return value;
  dropped.push(path);
  return typeof value === 'string' ? UNKNOWN : null;
}

/**
 * Field-level citation enforcement. Every leaf in `detail` must be backed by an
 * evidence row whose `field` equals the leaf's path or a prefix of it; anything
 * else is replaced with `unknown` (strings) or `null` (everything else) before
 * it is persisted or shown. This runs on the write path, so an uncited value a
 * model invented cannot reach the database.
 */
export function enforceFieldCitations<T>(
  detail: T,
  evidence: Evidence[],
): { detail: T; dropped: string[] } {
  const fields = new Set(evidence.map((e) => e.field).filter(Boolean));
  const dropped: string[] = [];
  const out = redact(detail as unknown as Json, '', fields, dropped);
  return { detail: out as unknown as T, dropped };
}

/**
 * Evidence rows are the only thing a scoring/drafting prompt sees — raw provider
 * payloads never reach the model.
 */
export function evidenceForPrompt(evidence: Evidence[]): string {
  return evidence
    .map((e) => {
      const src = e.sourceUrl ? ` <${e.sourceUrl}>` : '';
      const snippet = e.snippet ? `\n     quote: "${e.snippet.slice(0, 400)}"` : '';
      return `[${e.id}] (${e.field}) ${e.claim} — ${e.sourceKind}${src}${snippet}`;
    })
    .join('\n');
}

/** Drops rubric criteria whose cited evidence IDs do not exist. */
export function validateEvidenceIds(ids: string[], evidence: Evidence[]): string[] {
  const known = new Set(evidence.map((e) => e.id));
  return ids.filter((id) => known.has(id));
}
