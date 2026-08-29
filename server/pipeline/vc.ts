import type {
  Evidence,
  PartnerDetail,
  PortfolioOverlap,
  RoundProfile,
  VcInput,
} from '../../shared/types.js';
import { BudgetExceededError } from '../budget.js';
import {
  aviatoCompanySearch,
  aviatoOutboundInvestments,
  type AviatoCompany,
  type AviatoInvestment,
  type CallOptions,
} from '../providers/deepline.js';
import { completeJson } from '../providers/openai.js';
import { tavilySearch } from '../providers/tavily.js';
import { disqualifyPartner } from '../scoring/disqualify.js';
import { draftOutreach, scoreEntity } from '../scoring/score.js';
import { finalizeRow, isCancelled, rankRows, saveRow, upsertStep } from '../store.js';
import { cleanText, httpsUrl, median, monthsAgo, normalizeDomain } from './sanitize.js';

type Ev = Omit<Evidence, 'id' | 'retrievedAt'>;

/** Firms + partners named in search results, with the source that named them. */
const DISCOVERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['firms', 'competitorKeywords'],
  properties: {
    firms: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['firmName', 'partnerName', 'partnerTitle', 'sourceUrl', 'why'],
        properties: {
          firmName: { type: 'string' },
          partnerName: { type: 'string' },
          partnerTitle: { type: 'string' },
          sourceUrl: { type: 'string' },
          why: { type: 'string' },
        },
      },
    },
    competitorKeywords: { type: 'array', items: { type: 'string' } },
  },
} as const;

type Discovery = {
  firms: {
    firmName: string;
    partnerName: string;
    partnerTitle: string;
    sourceUrl: string;
    why: string;
  }[];
  competitorKeywords: string[];
};

async function discover(input: VcInput, opts: CallOptions, limit: number): Promise<Discovery> {
  const queries = [
    `${input.sectorTags.slice(0, 2).join(' ')} seed stage venture capital investors ${input.geography}`,
    `investors who led seed rounds in fleet management logistics software`,
    `${input.sectorTags[0] ?? 'logistics'} focused VC partner thesis blog post`,
  ];
  const results = (
    await Promise.all(queries.map((q) => tavilySearch(q, { ...opts, maxResults: 6 })))
  ).flat();

  const corpus = results
    .map((r, i) => `[S${i + 1}] ${r.title}\n  url: ${r.url}\n  ${cleanText(r.content, 700) ?? ''}`)
    .join('\n');

  return completeJson<Discovery>(
    'openai_discover_vc',
    {
      schemaName: 'vc_discovery',
      schema: DISCOVERY_SCHEMA,
      system: [
        'You extract investor leads from search results for a founder raising a round.',
        'Only name a firm or partner that appears in the supplied search results. Never add one',
        'from background knowledge. sourceUrl must be the url of the result that named them.',
        'Prefer named individual partners over firms with no person attached; if a result names a',
        'firm but no person, set partnerName to "" and still return the firm.',
        `Return at most ${limit} entries, most relevant first.`,
        'competitorKeywords: 4-8 lowercase terms that would appear in the description of a company',
        'building the SAME product as the sender (used to flag portfolio conflicts).',
      ].join('\n'),
      user: [
        `Sender: ${input.companyDescription}`,
        `Stage: ${input.stage}. Round: $${input.roundSizeUsd.toLocaleString()}. Geo: ${input.geography}.`,
        `Sectors: ${input.sectorTags.join(', ')}`,
        ``,
        `SEARCH RESULTS:`,
        corpus,
      ].join('\n'),
    },
    opts,
  );
}

const PARTNER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'title', 'sourceUrl'],
  properties: {
    name: { type: 'string' },
    title: { type: 'string' },
    sourceUrl: { type: 'string' },
  },
} as const;

/**
 * A firm is not a person to email, so when discovery names no partner we look
 * one up. Returns empty name if no source names a specific individual.
 */
async function resolvePartner(
  firmName: string,
  input: VcInput,
  opts: CallOptions,
): Promise<{ name: string; title: string; sourceUrl: string }> {
  const hits = await tavilySearch(
    `${firmName} partner team ${input.sectorTags[0] ?? ''} investments who to contact`,
    { ...opts, maxResults: 5 },
  );
  const corpus = hits
    .map((h) => `[${h.url}] ${h.title}\n  ${cleanText(h.content, 600) ?? ''}`)
    .join('\n');
  if (!corpus.trim()) return { name: '', title: '', sourceUrl: '' };

  return completeJson<{ name: string; title: string; sourceUrl: string }>(
    'openai_resolve_partner',
    {
      schemaName: 'partner_lookup',
      schema: PARTNER_SCHEMA,
      system: [
        `Identify the single investing partner at ${firmName} most likely to own this deal.`,
        'Only name a person who appears by name in the supplied results. If no individual is',
        'named, return empty strings for all three fields. Never guess a name.',
        'sourceUrl must be the result that named them.',
      ].join('\n'),
      user: `Sector focus we need: ${input.sectorTags.join(', ')}\n\nRESULTS:\n${corpus}`,
    },
    opts,
  );
}

/** Picks the Aviato entity that actually matches, rather than the first hit. */
function pickFirm(candidates: AviatoCompany[], firmName: string): AviatoCompany | undefined {
  const target = firmName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const scored = candidates
    .map((c) => {
      const name = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const hasSite = Boolean(c.URLs?.website);
      const hasLinkedin = Boolean(c.URLs?.linkedin);
      let score = 0;
      if (name === target) score += 5;
      else if (name.startsWith(target) || target.startsWith(name)) score += 3;
      // Prefer the entity with real identity links over near-duplicate shells
      // like "<Firm> LLC" that carry no website.
      if (hasSite) score += 2;
      if (hasLinkedin) score += 1;
      if (/\b(llc|lp|l\.p\.|inc)\b/.test(c.name.toLowerCase())) score -= 1;
      return { c, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best && best.score >= 3 ? best.c : undefined;
}

function buildRoundProfile(investments: AviatoInvestment[]): RoundProfile {
  const amounts = investments
    .map((i) => i.totalAmountRaised)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  if (amounts.length === 0) return { roundsCounted: 0, basis: 'unknown' };
  const sorted = [...amounts].sort((a, b) => a - b);
  return {
    medianRoundUsd: median(amounts),
    rangeUsd: [sorted[0]!, sorted[sorted.length - 1]!],
    roundsCounted: amounts.length,
    basis: 'observed',
  };
}

/**
 * Terms too generic to establish adjacency on their own. Counting "saas" as
 * overlap made every B2B investment look relevant.
 */
const GENERIC_TERMS = new Set([
  'saas',
  'ai',
  'b2b',
  'tech',
  'software',
  'vertical',
  'data',
  'platform',
  'cloud',
  'enterprise',
]);

function buildOverlap(
  investments: AviatoInvestment[],
  input: VcInput,
  competitorKeywords: string[],
): PortfolioOverlap[] {
  const sectorTerms = input.sectorTags
    .flatMap((t) => t.toLowerCase().split(/\s+/))
    .filter((t) => t.length > 3 && !GENERIC_TERMS.has(t));
  const adjacentTerms = [
    ...new Set([
      ...sectorTerms,
      'logistics',
      'freight',
      'fleet',
      'trucking',
      'supply chain',
      'transportation',
      'dispatch',
      'shipping',
      'last mile',
      'telematics',
      'warehouse',
    ]),
  ];
  const competitorTerms = competitorKeywords.map((k) => k.toLowerCase()).filter(Boolean);

  const out: PortfolioOverlap[] = [];
  for (const inv of investments) {
    const co = inv.company;
    if (!co) continue;
    const description = cleanText(co.description);
    const haystack = `${co.name} ${description ?? ''} ${(co.industryList ?? []).join(' ')}`.toLowerCase();

    const competitorHits = competitorTerms.filter((t) => t.length > 3 && haystack.includes(t));
    const adjacentHits = adjacentTerms.filter((t) => haystack.includes(t));
    if (competitorHits.length === 0 && adjacentHits.length === 0) continue;

    const conflict = competitorHits.length >= 2;
    out.push({
      company: co.name,
      url: httpsUrl(co.URLs?.website ?? co.URLs?.crunchbase),
      why: conflict
        ? `builds in the same space (${competitorHits.slice(0, 3).join(', ')})`
        : `adjacent: ${[...new Set(adjacentHits)].slice(0, 3).join(', ')}`,
      amountUsd: inv.totalAmountRaised,
      date: inv.date?.slice(0, 10),
      conflict,
    });
  }
  // Most recent first; recency is what the rubric weights.
  return out
    .sort((a, b) => (Date.parse(b.date ?? '') || 0) - (Date.parse(a.date ?? '') || 0))
    .slice(0, 12);
}

function stagesFromRounds(investments: AviatoInvestment[]): string[] {
  const stages = new Set<string>();
  for (const inv of investments) {
    const amount = inv.totalAmountRaised;
    if (!amount) continue;
    if (amount <= 1_500_000) stages.add('pre-seed');
    else if (amount <= 6_000_000) stages.add('seed');
    else if (amount <= 20_000_000) stages.add('series a');
    else if (amount <= 60_000_000) stages.add('series b');
    else stages.add('series c+');
  }
  return [...stages];
}

export async function runVcPipeline(
  runId: string,
  input: VcInput,
  pilot: boolean,
  forceRefresh: boolean,
): Promise<void> {
  const opts: CallOptions = { runId, forceRefresh };
  const target = `${input.companyDescription} Raising $${input.roundSizeUsd.toLocaleString()} at ${input.stage} in ${input.geography}.`;
  const limit = pilot ? 3 : 8;

  upsertStep(runId, 1, 'Discover candidate firms and partners', 'running');
  const discovery = await discover(input, opts, limit);
  upsertStep(
    runId,
    1,
    'Discover candidate firms and partners',
    'done',
    `${discovery.firms.length} leads from web research`,
  );

  upsertStep(runId, 2, 'Resolve firms and pull portfolios', 'running');
  let resolved = 0;
  let skipped = 0;

  type Prepared = {
    detail: PartnerDetail;
    evidence: Ev[];
    headline: Record<string, string>;
    flags: string[];
  };
  const prepared: Prepared[] = [];

  for (const lead of discovery.firms.slice(0, limit)) {
    if (isCancelled(runId)) return;
    try {
      const candidates = await aviatoCompanySearch(lead.firmName, opts, 5);
      const firm = pickFirm(candidates, lead.firmName);
      if (!firm) {
        skipped += 1;
        continue;
      }
      const investments = await aviatoOutboundInvestments(firm.id, opts, 40);
      resolved += 1;

      // Discovery often names a firm with no person attached; the shortlist has
      // to be people we can actually email.
      let partner = {
        name: lead.partnerName,
        title: lead.partnerTitle,
        sourceUrl: lead.sourceUrl,
        why: lead.why,
      };
      if (!partner.name) {
        const looked = await resolvePartner(firm.name, input, opts);
        if (looked.name) {
          partner = {
            name: looked.name,
            title: looked.title || 'Partner',
            sourceUrl: looked.sourceUrl || lead.sourceUrl,
            why: `named as ${looked.title || 'partner'} at ${firm.name}`,
          };
        }
      }

      const roundProfile = buildRoundProfile(investments);
      const overlap = buildOverlap(investments, input, discovery.competitorKeywords);
      const stages = stagesFromRounds(investments);
      const firmSite = httpsUrl(firm.URLs?.website);

      const evidence: Ev[] = [
        {
          field: 'firm.name',
          claim: `${firm.name} resolved to Aviato entity ${firm.id}${
            firm.URLs?.website ? ` (${normalizeDomain(firm.URLs.website)})` : ''
          }`,
          sourceKind: 'aviato',
          sourceUrl: firmSite,
        },
        {
          field: 'partner.name',
          claim: partner.name
            ? `${partner.name} named as ${partner.title || 'partner'} at ${firm.name}`
            : `no individual partner named in public sources for ${firm.name}`,
          sourceKind: 'tavily',
          sourceUrl: httpsUrl(partner.sourceUrl),
          snippet: cleanText(partner.why, 300),
        },
      ];

      if (firmSite) {
        evidence.push({
          field: 'firm.website',
          claim: `${firm.name} website is ${normalizeDomain(firmSite)}`,
          sourceKind: 'aviato',
          sourceUrl: firmSite,
        });
      }
      if (roundProfile.basis === 'observed') {
        evidence.push({
          field: 'roundProfile',
          claim:
            `across ${roundProfile.roundsCounted} recorded investments, median round total is ` +
            `$${Math.round((roundProfile.medianRoundUsd ?? 0) / 1000).toLocaleString()}K ` +
            `(range $${Math.round((roundProfile.rangeUsd?.[0] ?? 0) / 1000).toLocaleString()}K-` +
            `$${Math.round((roundProfile.rangeUsd?.[1] ?? 0) / 1000).toLocaleString()}K). ` +
            `These are round totals, not this firm's own check.`,
          sourceKind: 'aviato',
          sourceUrl: firmSite,
        });
        evidence.push({
          field: 'stageFit.stages',
          claim: `round totals imply participation at: ${stages.join(', ')}`,
          sourceKind: 'derived',
        });
      }
      overlap.forEach((o, i) => {
        const age = monthsAgo(o.date);
        const recency =
          age === undefined ? '' : age <= 24 ? ' [within last 24 months]' : ` [${Math.round(age / 12)}y ago]`;
        evidence.push({
          field: `portfolioOverlap.${i}`,
          claim:
            `invested in ${o.company}${o.date ? ` (${o.date})` : ''}` +
            `${o.amountUsd ? `, round total $${Math.round(o.amountUsd / 1000).toLocaleString()}K` : ''}` +
            `${recency} — ${o.why}`,
          sourceKind: 'aviato',
          sourceUrl: o.url,
        });
      });

      // Partner thesis in their own words, only if we have a person to research.
      let thesisSummary = '';
      if (partner.name) {
        const thesisHits = await tavilySearch(
          `"${partner.name}" ${firm.name} investment thesis what we look for`,
          { ...opts, maxResults: 4 },
        );
        const best = thesisHits.find((h) => cleanText(h.content));
        if (best) {
          thesisSummary = cleanText(best.content, 400) ?? '';
          evidence.push({
            field: 'thesis.summary',
            claim: `${partner.name}'s stated focus, from ${new URL(best.url).hostname}`,
            sourceKind: 'tavily',
            sourceUrl: best.url,
            snippet: thesisSummary,
          });
        }
      }

      const detail: PartnerDetail = {
        partner: {
          name: partner.name || `${firm.name} (no named partner found)`,
          title: partner.title || 'unknown',
          linkedinUrl: undefined,
        },
        firm: { name: firm.name, website: firmSite, aviatoId: firm.id },
        stageFit: { stages, leadsRounds: 'unknown' },
        roundProfile,
        portfolioOverlap: overlap,
        thesis: { summary: thesisSummary },
      };

      prepared.push({
        detail,
        evidence,
        headline: {
          firm: firm.name,
          title: partner.title || 'unknown',
          overlap: `${overlap.filter((o) => !o.conflict).length} adjacent`,
          medianRound: roundProfile.medianRoundUsd
            ? `$${Math.round(roundProfile.medianRoundUsd / 1000).toLocaleString()}K`
            : 'unknown',
        },
        flags: overlap.some((o) => o.conflict) ? ['portfolio conflict'] : [],
      });
    } catch (err) {
      if (err instanceof BudgetExceededError) throw err;
      skipped += 1;
      upsertStep(
        runId,
        2,
        'Resolve firms and pull portfolios',
        'running',
        `${lead.firmName}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  upsertStep(
    runId,
    2,
    'Resolve firms and pull portfolios',
    'done',
    `${resolved} resolved, ${skipped} unresolved`,
  );

  upsertStep(runId, 3, 'Disqualification pass (deterministic)', 'running');
  const survivors: Prepared[] = [];
  let disqualifiedCount = 0;
  for (const p of prepared) {
    const dq = disqualifyPartner(p.detail, input);
    if (dq) {
      disqualifiedCount += 1;
      // Persisted so the demo can show what was cut and why, but never scored,
      // never drafted, and never sent to a model.
      saveRow({
        runId,
        entityKind: 'partner',
        name: p.detail.partner.name,
        headline: p.headline,
        detail: p.detail,
        evidence: p.evidence,
        score: null,
        rubric: [],
        scoreReason: null,
        disqualified: dq,
        draftSubject: null,
        draftBody: null,
        flags: p.flags,
      });
    } else {
      survivors.push(p);
    }
  }
  upsertStep(
    runId,
    3,
    'Disqualification pass (deterministic)',
    'done',
    `${disqualifiedCount} disqualified before scoring, ${survivors.length} to score`,
  );

  upsertStep(runId, 4, 'Score against rubric and draft outreach', 'running');
  for (const p of survivors) {
    if (isCancelled(runId)) return;
    const { rowId } = saveRow({
      runId,
      entityKind: 'partner',
      name: p.detail.partner.name,
      headline: p.headline,
      detail: p.detail,
      evidence: p.evidence,
      score: null,
      rubric: [],
      scoreReason: null,
      disqualified: null,
      draftSubject: null,
      draftBody: null,
      flags: p.flags,
    });

    // Only the persisted evidence rows go to the model — never provider JSON.
    const evidence: Evidence[] = p.evidence.map((e, i) => ({
      ...e,
      id: `E${i + 1}`,
      retrievedAt: new Date().toISOString(),
    }));

    const scored = await scoreEntity(
      'vc',
      {
        name: p.detail.partner.name,
        oneLiner: `${p.detail.partner.title} at ${p.detail.firm.name}`,
        target,
      },
      evidence,
      opts,
    );
    // Things only true of this firm, used to verify the draft is not generic.
    const specificTerms = [
      p.detail.firm.name,
      ...p.detail.portfolioOverlap.map((o) => o.company),
    ].filter((t) => t && t !== 'unknown');

    const draft = await draftOutreach(
      'vc',
      {
        name: p.detail.partner.name,
        senderContext: target,
        ask: `a 20-minute intro call about the ${input.stage} round`,
        specificTerms,
      },
      evidence,
      scored.rubric,
      opts,
    );

    finalizeRow(rowId, {
      score: scored.score,
      rubric: scored.rubric,
      scoreReason: scored.reason,
      draftSubject: draft.subject,
      draftBody: draft.body,
      extraFlags: draft.personalized ? [] : ['draft not recipient-specific'],
    });
  }
  upsertStep(runId, 4, 'Score against rubric and draft outreach', 'done', `${survivors.length} scored`);

  rankRows(runId);
  upsertStep(runId, 5, 'Rank shortlist', 'done', 'emails resolved on demand for finalists only');
}
