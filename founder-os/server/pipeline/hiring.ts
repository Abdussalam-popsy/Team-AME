import type {
  CandidateDetail,
  Evidence,
  HiringInput,
  MustHaveAssessment,
} from '../../shared/types.js';
import { BudgetExceededError, RunDeadlineError } from '../budget.js';
import {
  crustdataPersonSearch,
  type CallOptions,
  type CrustdataEmployment,
  type CrustdataPerson,
  type PersonSearchCondition,
} from '../providers/deepline.js';
import { completeJson } from '../providers/openai.js';
import { tavilySearch } from '../providers/tavily.js';
import { disqualifyCandidate } from '../scoring/disqualify.js';
import { draftOutreach, scoreEntity } from '../scoring/score.js';
import { finalizeRow, isCancelled, rankRows, saveRow, upsertStep } from '../store.js';
import { cleanText, httpsUrl } from './sanitize.js';

type Ev = Omit<Evidence, 'id' | 'retrievedAt'>;

/**
 * Search terms derived from the JD. This is the only place the model shapes the
 * funnel; it never asserts a fact about a candidate.
 */
const QUERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titles', 'keywords', 'mustHaveTerms'],
  properties: {
    titles: { type: 'array', items: { type: 'string' } },
    keywords: { type: 'array', items: { type: 'string' } },
    mustHaveTerms: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['requirement', 'terms'],
        properties: {
          requirement: { type: 'string' },
          terms: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const;

type QueryPlan = {
  titles: string[];
  keywords: string[];
  mustHaveTerms: { requirement: string; terms: string[] }[];
};

async function planQueries(input: HiringInput, opts: CallOptions): Promise<QueryPlan> {
  return completeJson<QueryPlan>(
    'openai_plan_hiring',
    {
      schemaName: 'hiring_query_plan',
      schema: QUERY_SCHEMA,
      system: [
        'You translate a job description into search terms and matchable keywords.',
        'titles: 3-6 realistic current job titles for people who could do this job.',
        'keywords: 5-10 technology/domain terms that would appear on a strong profile.',
        'mustHaveTerms: for EACH must-have, the lowercase substrings that, if present in a',
        'profile, constitute evidence of it. Be precise: for a language requirement list only',
        'the language names and obvious variants, never adjacent languages.',
      ].join('\n'),
      user: [
        `Role: ${input.role} (${input.seniority}), ${input.location}`,
        input.jobDescription,
        `Must-haves: ${input.mustHaves.join('; ')}`,
        `Nice-to-haves: ${input.niceToHaves.join('; ')}`,
      ].join('\n'),
    },
    opts,
  );
}

/** Flattened view of the parts of a v3 profile we actually use. */
type Person = {
  name: string;
  title: string;
  headline: string;
  company: string;
  location?: string;
  linkedin?: string;
  github?: string;
  roles: { role: string; company: string; start?: string; end?: string; headcount?: number }[];
};

function employmentCompany(e: CrustdataEmployment): string {
  return (e.company_name ?? e.name ?? '').trim();
}

function flatten(p: CrustdataPerson): Person {
  const bp = p.basic_profile ?? {};
  const ed = p.experience?.employment_details ?? {};
  const current = (ed.current ?? [])[0];
  const roles = [...(ed.current ?? []), ...(ed.past ?? [])].slice(0, 8).map((e) => ({
    role: e.title ?? 'unknown',
    company: employmentCompany(e) || 'unknown',
    start: e.start_date?.slice(0, 10),
    end: e.end_date?.slice(0, 10),
    headcount: e.company_headcount_latest,
  }));
  return {
    name: (bp.name ?? '').trim(),
    title: (bp.current_title ?? current?.title ?? '').trim(),
    headline: (bp.headline ?? '').trim(),
    company: current ? employmentCompany(current) : '',
    location: bp.location?.full_location ?? undefined,
    linkedin: httpsUrl(p.social_handles?.professional_network_identifier?.profile_url ?? undefined),
    github: httpsUrl(p.social_handles?.dev_platform_identifier?.profile_url ?? undefined),
    roles,
  };
}

/** Dedupe on LinkedIn URL, falling back to name+company. */
function dedupe(people: Person[]): Person[] {
  const seen = new Set<string>();
  const out: Person[] = [];
  for (const p of people) {
    if (!p.name) continue;
    const key = p.linkedin
      ? p.linkedin.toLowerCase().replace(/\/$/, '')
      : `${p.name.toLowerCase()}|${p.company.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** Title and headline only: a hit here is the candidate's own current framing. */
function titleCorpus(p: Person): string {
  return [p.title, p.headline, ...p.roles.map((r) => r.role)]
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase();
}

function profileCorpus(p: Person, extra: string[]): string {
  return [
    p.title,
    p.headline,
    p.company,
    ...p.roles.map((r) => `${r.role} ${r.company}`),
    ...extra,
  ]
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase();
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Company headcount is our early-stage proxy. The floor matters as much as the
 * ceiling: a headcount of 1 is a solo consultancy or a side project, not a
 * pre-seed-to-Series-A company, and counting it inflates the criterion.
 */
const EARLY_STAGE_MIN_HEADCOUNT = 2;
const EARLY_STAGE_MAX_HEADCOUNT = 50;

function earlyStageRoles(p: Person): { role: string; company: string; headcount: number }[] {
  return p.roles
    .filter((r): r is typeof r & { headcount: number } => typeof r.headcount === 'number')
    .filter(
      (r) =>
        r.headcount >= EARLY_STAGE_MIN_HEADCOUNT && r.headcount <= EARLY_STAGE_MAX_HEADCOUNT,
    )
    .map((r) => ({ role: r.role, company: r.company, headcount: r.headcount }));
}

function isEarlyStageRequirement(requirement: string): boolean {
  const r = requirement.toLowerCase();
  return /early[- ]stage|pre-seed|seed|series a|startup/.test(r);
}

/** A public page found for this candidate, used to corroborate a requirement. */
type ResearchHit = { url: string; text: string };

/** How close to a mention of the candidate a term must appear to count. */
const CORROBORATION_WINDOW_CHARS = 400;

/**
 * Research results include aggregator pages that list many engineers, where a
 * term can appear because of somebody else on the page. A hit only counts when
 * it sits near a mention of this candidate.
 */
function termsNearName(text: string, name: string, terms: string[]): string[] {
  const body = text.toLowerCase();
  const needle = name.toLowerCase();
  const windows: [number, number][] = [];
  for (let at = body.indexOf(needle); at !== -1; at = body.indexOf(needle, at + 1)) {
    windows.push([at - CORROBORATION_WINDOW_CHARS, at + needle.length + CORROBORATION_WINDOW_CHARS]);
  }
  if (windows.length === 0) return [];
  return terms.filter((t) => {
    for (let at = body.indexOf(t); at !== -1; at = body.indexOf(t, at + 1)) {
      if (windows.some(([lo, hi]) => at >= lo && at <= hi)) return true;
    }
    return false;
  });
}

/**
 * Deterministic must-have matching. Runs before any scoring call so that the
 * disqualification decision is never a model judgement.
 *
 * `met` requires a citable source: structured employment data, the candidate's
 * own title/headline, or a public page whose URL is recorded. A provider skill
 * filter match proves only that one of several skills is listed somewhere, so it
 * can never promote a requirement past `partial` on its own — an attempted
 * corroboration that came back empty leaves it there.
 */
function assessMustHaves(
  input: HiringInput,
  plan: QueryPlan,
  person: Person,
  research: ResearchHit[],
  skillTerms: string[],
): MustHaveAssessment[] {
  const titles = titleCorpus(person);
  const profile = profileCorpus(person, []);
  return input.mustHaves.map((requirement) => {
    if (isEarlyStageRequirement(requirement)) {
      const early = earlyStageRoles(person);
      if (early.length === 0) {
        return {
          requirement,
          met: false,
          evidence:
            `no recorded role at a company of ` +
            `${EARLY_STAGE_MIN_HEADCOUNT}-${EARLY_STAGE_MAX_HEADCOUNT} employees`,
        };
      }
      const shown = early
        .slice(0, 2)
        .map((r) => `${r.company} (~${r.headcount} employees)`)
        .join(', ');
      return {
        requirement,
        met: true,
        evidence: `worked at ${shown}`,
        sourceUrl: person.linkedin,
      };
    }

    const planned = plan.mustHaveTerms.find(
      (m) => m.requirement.toLowerCase().trim() === requirement.toLowerCase().trim(),
    );
    const terms = (planned?.terms ?? requirement.toLowerCase().split(/[\s/,]+/))
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length > 2);

    const titleHits = terms.filter((t) => titles.includes(t));
    const profileHits = terms.filter((t) => profile.includes(t));
    const corroborating = research
      .map((h) => ({ url: h.url, hits: termsNearName(h.text, person.name, terms) }))
      .find((h) => h.hits.length > 0);

    // Proves at least one of the filtered skills is on their public skill list,
    // but not which one — the account cannot return the list itself.
    const bySkillFilter =
      skillTerms.length > 0 && terms.some((t) => skillTerms.some((s) => s.toLowerCase() === t));

    if (titleHits.length > 0) {
      return {
        requirement,
        met: true,
        evidence: `their own title/headline states: ${[...new Set(titleHits)].slice(0, 4).join(', ')}`,
        sourceUrl: person.linkedin,
      };
    }
    if (corroborating) {
      return {
        requirement,
        met: true,
        evidence:
          `corroborated on ${hostOf(corroborating.url)}: ` +
          `${[...new Set(corroborating.hits)].slice(0, 4).join(', ')}` +
          (bySkillFilter ? `; also matched the provider skill filter` : ''),
        sourceUrl: corroborating.url,
      };
    }
    if (profileHits.length > 0) {
      return {
        requirement,
        met: 'partial',
        evidence: `only in profile text (${[...new Set(profileHits)].slice(0, 4).join(', ')}), no public source found`,
        sourceUrl: person.linkedin,
      };
    }
    if (bySkillFilter) {
      return {
        requirement,
        met: 'partial',
        evidence:
          `matched a provider skill filter for ${skillTerms.join('/')}; public search found no ` +
          `page stating it, so this stays partial`,
      };
    }
    return { requirement, met: false, evidence: 'no matching term in profile or public search' };
  });
}

/**
 * One search per planned title. Skills are filterable even though they are not
 * returnable on this account, so the language requirement narrows the funnel at
 * the provider instead of after the fact.
 */
function searchFilters(
  title: string,
  plan: QueryPlan,
  skillTerms: string[],
): { op: 'and'; conditions: PersonSearchCondition[] } {
  const conditions: PersonSearchCondition[] = [
    { field: 'experience.employment_details.current.title', type: '(.)', value: title },
    { field: 'basic_profile.location.country', type: '=', value: 'United States' },
  ];
  if (skillTerms.length > 0) {
    conditions.push({
      field: 'skills.professional_network_skills',
      type: 'in',
      value: skillTerms,
    });
  } else if (plan.keywords.length > 0) {
    conditions.push({
      field: 'basic_profile.headline',
      type: '(.)',
      value: plan.keywords[0],
    });
  }
  return { op: 'and', conditions };
}

/** Language/skill terms from the must-have plan, used as a provider-side filter. */
function skillFilterTerms(input: HiringInput, plan: QueryPlan): string[] {
  const langReq = input.mustHaves.find((m) => /rust|go\b|golang|python|java|c\+\+/i.test(m));
  if (!langReq) return [];
  const planned = plan.mustHaveTerms.find(
    (m) => m.requirement.toLowerCase().trim() === langReq.toLowerCase().trim(),
  );
  // Skill values are matched exactly by the provider, so they need canonical casing.
  const titleCase = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const expanded = new Set(
    (planned?.terms ?? [])
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (/^go(lang)?$/i.test(t) ? 'Go' : titleCase(t))),
  );
  if (expanded.has('Go')) expanded.add('Golang');
  return [...expanded].slice(0, 6);
}

export async function runHiringPipeline(
  runId: string,
  input: HiringInput,
  pilot: boolean,
  forceRefresh: boolean,
): Promise<void> {
  const opts: CallOptions = { runId, forceRefresh };
  const limit = pilot ? 3 : 10;
  const target =
    `${input.role} (${input.seniority}), ${input.location}, ` +
    `$${input.compRangeUsd[0].toLocaleString()}-$${input.compRangeUsd[1].toLocaleString()}. ` +
    input.jobDescription;

  upsertStep(runId, 1, 'Translate role into search plan', 'running');
  const plan = await planQueries(input, opts);
  upsertStep(
    runId,
    1,
    'Translate role into search plan',
    'done',
    `${plan.titles.length} titles, ${plan.keywords.length} keywords`,
  );

  upsertStep(runId, 2, 'Search and dedupe candidates', 'running');
  const skillTerms = skillFilterTerms(input, plan);
  const searches = await Promise.allSettled(
    plan.titles
      .slice(0, pilot ? 1 : 3)
      .map((title) =>
        crustdataPersonSearch(
          { filters: searchFilters(title, plan, skillTerms), limit: pilot ? 5 : 25 },
          opts,
        ),
      ),
  );
  const found = searches.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));
  const failures = searches.filter((s) => s.status === 'rejected').length;
  const people = dedupe(found.map(flatten)).slice(0, limit);
  upsertStep(
    runId,
    2,
    'Search and dedupe candidates',
    people.length > 0 ? 'done' : 'failed',
    `${found.length} raw, ${people.length} unique${failures > 0 ? `, ${failures} search(es) failed` : ''}`,
  );
  if (people.length === 0) {
    throw new Error(
      failures > 0
        ? 'candidate search returned no usable results (all provider searches failed)'
        : 'candidate search returned no results for this role',
    );
  }

  upsertStep(runId, 3, 'Enrich and build evidence', 'running');
  type Prepared = {
    detail: CandidateDetail;
    evidence: Ev[];
    headline: Record<string, string>;
    flags: string[];
  };
  const prepared: Prepared[] = [];

  for (const p of people) {
    if (isCancelled(runId)) return;
    try {
      const { name, company, linkedin } = p;
      const title = p.title || p.headline;

      const evidence: Ev[] = [
        {
          field: 'person.name',
          claim: `${name}${title ? `, ${title}` : ''}${company ? ` at ${company}` : ''}`,
          sourceKind: 'crustdata',
          sourceUrl: linkedin,
        },
      ];
      if (title) {
        evidence.push({
          field: 'person.title',
          claim: `current title: ${title}`,
          sourceKind: 'crustdata',
          sourceUrl: linkedin,
        });
      }
      if (company) {
        evidence.push({
          field: 'person.company',
          claim: `currently at ${company}`,
          sourceKind: 'crustdata',
          sourceUrl: linkedin,
        });
      }
      if (p.location) {
        evidence.push({
          field: 'person.location',
          claim: `located in ${p.location}`,
          sourceKind: 'crustdata',
          sourceUrl: linkedin,
        });
      }
      if (linkedin) {
        evidence.push({
          field: 'person.links',
          claim: `public profile: ${linkedin}`,
          sourceKind: 'crustdata',
          sourceUrl: linkedin,
        });
      }

      if (p.github) {
        evidence.push({
          field: 'person.links',
          claim: `public code profile: ${p.github}`,
          sourceKind: 'crustdata',
          sourceUrl: p.github,
        });
      }

      const history = p.roles.slice(0, 6).map((r, i) => {
        const span = r.start
          ? ` (${r.start.slice(0, 7)}${r.end ? `–${r.end.slice(0, 7)}` : '–present'})`
          : '';
        const size = r.headcount ? `, ~${r.headcount} employees` : '';
        evidence.push({
          field: `history.${i}`,
          claim: `${r.role} at ${r.company}${span}${size}`,
          sourceKind: 'crustdata',
          sourceUrl: linkedin,
        });
        return { role: r.role, company: r.company, start: r.start, end: r.end };
      });

      if (skillTerms.length > 0) {
        evidence.push({
          field: 'searchFilterMatch',
          claim:
            `returned by a Crustdata search filtered on listed skills ` +
            `(${skillTerms.join(', ')}), so at least one is on their public skill list`,
          sourceKind: 'crustdata',
          sourceUrl: linkedin,
        });
      }

      // One narrative lookup per candidate: public work in their own footprint.
      const background = await tavilySearch(
        `"${name}" ${company} ${plan.keywords.slice(0, 3).join(' ')} engineer`,
        { ...opts, maxResults: 3 },
      );
      const signals: { kind: string; detail: string }[] = [];
      background.slice(0, 2).forEach((hit, i) => {
        const snippet = cleanText(hit.content, 300);
        if (!snippet) return;
        const host = hostOf(hit.url);
        signals.push({ kind: host, detail: snippet });
        evidence.push({
          field: `signals.${i}`,
          claim: `public activity found on ${host}: ${hit.title}`,
          sourceKind: 'tavily',
          sourceUrl: hit.url,
          snippet,
        });
      });

      // The corroboration pass sees every page the research step returned, with
      // its URL, so a met must-have can cite the page rather than the filter.
      const research: ResearchHit[] = background.map((hit) => ({
        url: hit.url,
        text: `${hit.title}\n${hit.content ?? ''}`,
      }));
      const mustHaves = assessMustHaves(input, plan, p, research, skillTerms);
      mustHaves.forEach((m, i) => {
        const corroborated = Boolean(m.sourceUrl) && m.sourceUrl !== linkedin;
        evidence.push({
          field: `mustHaves.${i}`,
          claim: `${m.requirement}: ${m.met === true ? 'met' : m.met === 'partial' ? 'partial' : 'not evidenced'} — ${m.evidence}`,
          sourceKind: corroborated ? 'tavily' : 'derived',
          sourceUrl: m.sourceUrl ?? linkedin,
        });
      });

      const gaps = mustHaves.filter((m) => m.met !== true).map((m) => m.requirement);
      gaps.forEach((g, i) => {
        const partial = mustHaves.find((m) => m.requirement === g)?.met === 'partial';
        evidence.push({
          field: `gaps.${i}`,
          claim: partial ? `only partial evidence of: ${g}` : `no evidence of: ${g}`,
          sourceKind: 'derived',
        });
      });

      const detail: CandidateDetail = {
        person: {
          name,
          title: title || 'unknown',
          company: company || 'unknown',
          location: p.location,
          links: [linkedin, p.github].filter((l): l is string => Boolean(l)),
        },
        history,
        mustHaves,
        signals,
        gaps,
      };

      prepared.push({
        detail,
        evidence,
        headline: {
          title: title || 'unknown',
          company: company || 'unknown',
          location: p.location ?? 'unknown',
          mustHaves: `${mustHaves.filter((m) => m.met === true).length}/${input.mustHaves.length} met`,
        },
        flags: gaps.length > 0 ? [`${gaps.length} gap(s)`] : [],
      });
    } catch (err) {
      if (err instanceof BudgetExceededError || err instanceof RunDeadlineError) throw err;
      upsertStep(
        runId,
        3,
        'Enrich and build evidence',
        'running',
        `${p.name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  upsertStep(runId, 3, 'Enrich and build evidence', 'done', `${prepared.length} enriched`);

  upsertStep(runId, 4, 'Disqualification pass (deterministic)', 'running');
  const survivors: Prepared[] = [];
  let disqualifiedCount = 0;
  for (const c of prepared) {
    const dq = disqualifyCandidate(c.detail, input);
    if (dq) {
      disqualifiedCount += 1;
      saveRow({
        runId,
        entityKind: 'candidate',
        name: c.detail.person.name,
        headline: c.headline,
        detail: c.detail,
        evidence: c.evidence,
        score: null,
        rubric: [],
        scoreReason: null,
        disqualified: dq,
        draftSubject: null,
        draftBody: null,
        flags: c.flags,
      });
    } else {
      survivors.push(c);
    }
  }
  upsertStep(
    runId,
    4,
    'Disqualification pass (deterministic)',
    'done',
    `${disqualifiedCount} disqualified before scoring, ${survivors.length} to score`,
  );

  upsertStep(runId, 5, 'Score against rubric and draft outreach', 'running');
  for (const c of survivors) {
    if (isCancelled(runId)) return;
    const { rowId } = saveRow({
      runId,
      entityKind: 'candidate',
      name: c.detail.person.name,
      headline: c.headline,
      detail: c.detail,
      evidence: c.evidence,
      score: null,
      rubric: [],
      scoreReason: null,
      disqualified: null,
      draftSubject: null,
      draftBody: null,
      flags: c.flags,
    });

    const evidence: Evidence[] = c.evidence.map((e, i) => ({
      ...e,
      id: `E${i + 1}`,
      retrievedAt: new Date().toISOString(),
    }));

    const scored = await scoreEntity(
      'hiring',
      {
        name: c.detail.person.name,
        oneLiner: `${c.detail.person.title} at ${c.detail.person.company}`,
        target,
      },
      evidence,
      opts,
    );
    // Things only true of this candidate, used to verify the draft is not generic.
    const specificTerms = [
      ...c.detail.history.map((h) => h.company),
      c.detail.person.company,
      ...c.detail.mustHaves.filter((m) => m.met === true).map((m) => m.requirement),
    ].filter((t) => t && t !== 'unknown');

    const draft = await draftOutreach(
      'hiring',
      {
        name: c.detail.person.name,
        senderContext: target,
        ask: `a short call about owning the routing engine as ${input.role}`,
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
  upsertStep(runId, 5, 'Score against rubric and draft outreach', 'done', `${survivors.length} scored`);

  rankRows(runId);
  upsertStep(runId, 6, 'Rank shortlist', 'done', 'emails resolved on demand for finalists only');
}
