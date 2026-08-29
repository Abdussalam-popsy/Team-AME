import { TALENT } from '../data/talent'
import { INVESTORS } from '../data/investors'
import type {
  Availability,
  Diagnosis,
  Gap,
  Investor,
  Role,
  Severity,
  Startup,
  TalentProfile,
} from './types'

const SEVERITY_COST: Record<Severity, number> = {
  critical: 24,
  major: 12,
  minor: 5,
}

const TECHNICAL_ROLES: Role[] = ['cto', 'engineer', 'data']
const COMMERCIAL_ROLES: Role[] = ['ceo', 'sales', 'growth']

/** Sector-specific role a credible team cannot be missing. */
const DOMAIN_REQUIREMENT: Partial<Record<Startup['sector'], string>> = {
  healthtech: 'a clinician who has survived NHS procurement',
  fintech: 'someone who has handled FCA compliance and KYC',
  climate: 'a hardware or measurement specialist',
  deeptech: 'a researcher who can defend the science',
}

function has(startup: Startup, roles: Role[]): boolean {
  return roles.some((role) => startup.rolesPresent.includes(role))
}

function matchTalent(
  startup: Startup,
  roles: Role[],
  availability: Availability[],
  limit = 3,
): TalentProfile[] {
  return TALENT.map((person) => {
    let score = 0
    for (const role of person.roles) if (roles.includes(role)) score += 3
    if (person.sectors.includes(startup.sector)) score += 2
    if (availability.includes(person.availability)) score += 2
    return { person, score }
  })
    .filter((entry) => entry.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.person)
}

function matchInvestors(startup: Startup, limit = 2): Investor[] {
  return INVESTORS.filter(
    (investor) =>
      investor.sectors.includes(startup.sector) && investor.stages.includes(startup.stage),
  ).slice(0, limit)
}

/**
 * Founder OS: acts as the missing CEO. It reads the grave, names what is
 * missing, and points at a specific human in the AMe database for each gap.
 */
export function diagnose(startup: Startup): Diagnosis {
  const gaps: Gap[] = []

  if (!has(startup, TECHNICAL_ROLES)) {
    gaps.push({
      id: 'technical',
      title: 'No one can build it',
      severity: 'critical',
      diagnosis:
        'The team has no technical role. Every week without a builder is a week the idea decays.',
      prescription: 'Bring in a technical cofounder and ship a rough version in 14 days.',
      talent: matchTalent(startup, ['cto', 'engineer'], ['cofounder', 'contract']),
      investors: [],
    })
  }

  if (!has(startup, COMMERCIAL_ROLES)) {
    gaps.push({
      id: 'commercial',
      title: 'No one is selling it',
      severity: 'critical',
      diagnosis:
        'Nobody on the team owns customers. This is the most common cause of a technically excellent grave.',
      prescription: 'Add a commercial cofounder and book 20 customer conversations this month.',
      talent: matchTalent(startup, ['sales', 'growth', 'ceo'], ['cofounder', 'contract']),
      investors: [],
    })
  }

  if (startup.teamSize === 1) {
    gaps.push({
      id: 'solo',
      title: 'Solo founder',
      severity: 'critical',
      diagnosis:
        'Solo founders stall on the first hard week. There is no one to carry the momentum when you cannot.',
      prescription:
        'Run a 4-week paid trial project with one AMe match before signing any equity. Vesting from day one.',
      talent: matchTalent(startup, ['cto', 'engineer', 'growth', 'ops'], ['cofounder']),
      investors: [],
    })
  }

  const domainNeed = DOMAIN_REQUIREMENT[startup.sector]
  if (domainNeed && !startup.rolesPresent.includes('domain')) {
    gaps.push({
      id: 'domain',
      title: 'No insider credibility',
      severity: 'major',
      diagnosis: `${startup.sector} buyers will not take a meeting without ${domainNeed}.`,
      prescription: 'Add an AMe mentor as a formal advisor (0.25–0.5% over 2 years) and cite them in every pitch.',
      talent: matchTalent(startup, ['domain', 'ops'], ['advisor']),
      investors: [],
    })
  }

  if (startup.stage !== 'idea' && startup.users < 50) {
    gaps.push({
      id: 'traction',
      title: 'Built, but nobody came',
      severity: 'major',
      diagnosis: `${startup.users} users after reaching ${startup.stage}. The product was never the problem — distribution was.`,
      prescription: 'One channel, four weeks, a public number. Kill anything that is not the channel.',
      talent: matchTalent(startup, ['growth', 'designer'], ['contract', 'cofounder']),
      investors: [],
    })
  }

  if (startup.runwayMonths === 0 && !startup.hasRaised) {
    const revenue = startup.monthlyRevenueGbp
    gaps.push({
      id: 'capital',
      title: 'Zero runway',
      severity: revenue > 0 ? 'major' : 'minor',
      diagnosis:
        revenue > 0
          ? `£${revenue}/mo of revenue is real proof and it is being wasted. This is fundable now.`
          : 'No runway and no revenue. Non-dilutive money first — do not sell equity off a dead cap table.',
      prescription:
        revenue > 0
          ? 'Package the pilot into a 5-slide traction memo and take the warm intros below.'
          : 'Apply for a grant this month; treat equity as a later, better-priced option.',
      talent: matchTalent(startup, ['ops', 'ceo'], ['cofounder', 'advisor'], 2),
      investors: matchInvestors(startup),
    })
  }

  if (startup.causeOfDeath === 'cofounder-split') {
    gaps.push({
      id: 'governance',
      title: 'Unresolved cofounder wreckage',
      severity: 'major',
      diagnosis:
        'A previous split with no paperwork is a landmine. No investor will touch an unclear cap table.',
      prescription:
        'Clean the cap table before recruiting: written split, 4-year vesting, 1-year cliff, IP assigned to the company.',
      talent: matchTalent(startup, ['ops'], ['advisor', 'cofounder'], 2),
      investors: [],
    })
  }

  if (startup.users > 500 && !startup.rolesPresent.includes('data')) {
    gaps.push({
      id: 'data',
      title: 'Flying blind on your own users',
      severity: 'minor',
      diagnosis: `${startup.users} users and no one owns the numbers. The revival story is already in that data.`,
      prescription: 'Stand up one dashboard: activation, week-4 retention, revenue per user.',
      talent: matchTalent(startup, ['data'], ['contract', 'intern'], 2),
      investors: [],
    })
  }

  const penalty = gaps.reduce((total, gap) => total + SEVERITY_COST[gap.severity], 0)
  const evidence = (startup.users > 0 ? 6 : 0) + (startup.monthlyRevenueGbp > 0 ? 10 : 0)
  const revivalScore = Math.max(8, Math.min(100, 100 - penalty + evidence))

  return {
    revivalScore,
    verdict: verdictFor(revivalScore, gaps),
    gaps: gaps.sort((a, b) => SEVERITY_COST[b.severity] - SEVERITY_COST[a.severity]),
    nextThreeMoves: nextMoves(startup, gaps),
  }
}

function verdictFor(score: number, gaps: Gap[]): string {
  const critical = gaps.filter((gap) => gap.severity === 'critical').length
  if (score >= 75) return 'Revivable this month. One person short of alive.'
  if (score >= 50) return `Revivable. ${critical} structural hole${critical === 1 ? '' : 's'} to fill first.`
  if (score >= 30) return 'Needs a rebuilt team before the idea is worth restarting.'
  return 'Honest answer: restart it with a different team, or let it rest.'
}

function nextMoves(startup: Startup, gaps: Gap[]): string[] {
  const moves = gaps.slice(0, 2).map((gap) => {
    const person = gap.talent[0]
    return person
      ? `${gap.prescription} Start with ${person.name} (${person.handle}).`
      : gap.prescription
  })
  moves.push(
    startup.monthlyRevenueGbp > 0
      ? `Set one revival milestone: double £${startup.monthlyRevenueGbp}/mo in 30 days, then claim the AMe Student Seed Pool.`
      : 'Set one revival milestone: 10 paying or 100 active users in 30 days, then re-open this grave.',
  )
  return moves.slice(0, 3)
}
