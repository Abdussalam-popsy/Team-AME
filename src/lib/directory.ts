import { COHORT_STARTUPS, NOTABLE_PEOPLE } from '../data/cohorts'
import { TEAM } from '../data/team'
import { SEED_STARTUPS } from '../data/startups'

export interface DirectoryStartup {
  id: string
  name: string
  tagline: string
  sector: string
  cohort: string
  founders: string[]
  status: 'active' | 'raising' | 'dormant' | 'exited'
  note?: string
  real: boolean
}

export interface Person {
  id: string
  name: string
  headline: string
  detail: string
  group: 'cohort' | 'cofounder' | 'team'
  linkedin?: string
  notable: boolean
}

export const DIRECTORY_SIZE = 1000
export const PEOPLE_SIZE = 2000

/** Deterministic PRNG so the generated directory is stable across reloads. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T>(rand: () => number, list: T[]): T => list[Math.floor(rand() * list.length)]

const NAME_A = ['Volt', 'Nest', 'Loop', 'Forge', 'Pixel', 'Atlas', 'Nova', 'Ember', 'Drift', 'Flux', 'Haven', 'Orbit', 'Pulse', 'Quill', 'Ridge', 'Sable', 'Tide', 'Umber', 'Vertex', 'Willow', 'Zephyr', 'Cinder', 'Beacon', 'Lumen', 'Marrow', 'Nimbus', 'Onset', 'Prism', 'Quarry', 'Relay']
const NAME_B = ['ly', 'io', 'ify', 'Lab', 'Base', 'Kit', 'Hub', 'Stack', 'Sense', 'Flow', 'Path', 'Cast', 'Mind', 'Grid', 'Link', 'Sync', 'Yard', 'Works', 'Line', 'Point']
const SECTORS = ['ai', 'fintech', 'healthtech', 'climate', 'consumer', 'edtech', 'deeptech', 'marketplace', 'proptech', 'legaltech', 'foodtech', 'mobility']
const AUDIENCES = ['students', 'landlords', 'clinics', 'indie retailers', 'small agencies', 'freelancers', 'first-time founders', 'campus societies', 'local gyms', 'restaurants', 'course leaders', 'junior devs']
const WHATS = ['an AI copilot', 'a marketplace', 'a compliance layer', 'an analytics dashboard', 'a booking engine', 'a payments tool', 'a matching platform', 'an automation agent', 'a discovery app', 'a diagnostics kit']
const STATUSES: DirectoryStartup['status'][] = ['active', 'active', 'active', 'raising', 'dormant', 'dormant', 'exited']

const FIRST = ['Amelia', 'Oliver', 'Sophia', 'Leo', 'Maya', 'Ethan', 'Zara', 'Noah', 'Freya', 'Lucas', 'Aisha', 'James', 'Elena', 'Kai', 'Priya', 'Daniel', 'Hana', 'Tom', 'Nadia', 'Ryan', 'Ines', 'Omar', 'Lily', 'Hugo', 'Sara', 'Felix', 'Anya', 'Marco', 'Yuki', 'Sean', 'Fatima', 'Adam', 'Chloe', 'Ivan', 'Leila', 'Ben', 'Nina', 'Raj', 'Emma', 'Kofi']
const LAST = ['Walker', 'Chen', 'Patel', 'Novak', 'Okafor', 'Silva', 'Kim', 'Ahmed', 'Kowalski', 'Ross', 'Tanaka', 'Byrne', 'Costa', 'Ivanov', 'Osei', 'Marsh', 'Lindgren', 'Haddad', 'Moretti', 'Zhang', 'Dubois', 'Nakamura', 'Weber', 'Olsen', 'Reyes', 'Khan', 'Murphy', 'Santos', 'Popescu', 'Adeyemi']
const DEGREES = ['CS', 'Mechanical Engineering', 'Economics', 'Physics', 'Business', 'Design', 'Law', 'Data Science', 'Biomed', 'Maths']
const UNIS = ['UoM', 'MMU', 'Salford', 'Lancaster', 'Leeds', 'Liverpool', 'Sheffield', 'UCL', 'Imperial', 'Edinburgh']
const PROOFS = ['shipped a product with 1k users before graduating', 'won a Manchester hackathon', 'interned at a Series B startup', 'runs a society of 400+ members', 'freelances for three paying clients', 'published research as an undergrad', 'built and sold a niche SaaS', 'grew a newsletter to 5k readers', 'led a 10-person project team', 'taught themselves to code in a term']

function generatedStartups(count: number): DirectoryStartup[] {
  const rand = mulberry32(1313)
  const out: DirectoryStartup[] = []
  const used = new Set<string>()
  while (out.length < count) {
    let name = `${pick(rand, NAME_A)}${pick(rand, NAME_B)}`
    if (used.has(name)) name = `${name} ${pick(rand, NAME_A)}`
    if (used.has(name)) continue
    used.add(name)
    const founders = Array.from(
      { length: 1 + Math.floor(rand() * 3) },
      () => `${pick(rand, FIRST)} ${pick(rand, LAST)}`,
    )
    out.push({
      id: `gen-s-${out.length}`,
      name,
      tagline: `${pick(rand, WHATS)} for ${pick(rand, AUDIENCES)}`,
      sector: pick(rand, SECTORS),
      cohort: `Cohort ${1 + Math.floor(rand() * 13)}`,
      founders,
      status: pick(rand, STATUSES),
      real: false,
    })
  }
  return out
}

let startupCache: DirectoryStartup[] | null = null

/** ~1,000 startups: real AME cohort companies and graveyard entries first, generated fill after. */
export function directoryStartups(): DirectoryStartup[] {
  if (startupCache) return startupCache
  const real: DirectoryStartup[] = COHORT_STARTUPS.map((s, i) => ({
    id: `ame-s-${i}`,
    name: s.name,
    tagline: s.note ?? `Accelerate ME cohort ${s.cohort} startup`,
    sector: 'ame',
    cohort: `Cohort ${s.cohort}`,
    founders: s.founders,
    status: s.note ? 'active' : 'dormant',
    note: s.note,
    real: true,
  }))
  const graveyard: DirectoryStartup[] = SEED_STARTUPS.map((s) => ({
    id: s.id,
    name: s.name,
    tagline: s.tagline,
    sector: s.sector,
    cohort: s.hackathon ?? 'Hackathon',
    founders: [s.submittedBy],
    status: s.status === 'reviving' ? 'active' : 'dormant',
    real: true,
  }))
  startupCache = [...real, ...graveyard, ...generatedStartups(DIRECTORY_SIZE - real.length - graveyard.length)]
  return startupCache
}

let peopleCache: Person[] | null = null

/** ~2,000 people: notable names first, then the AME team, cohort founders, then generated fill. */
export function people(): Person[] {
  if (peopleCache) return peopleCache
  const notable: Person[] = NOTABLE_PEOPLE.map((p, i) => ({
    id: `notable-${i}`,
    name: p.name,
    headline: p.headline,
    detail: p.achievement,
    group: 'cohort',
    linkedin: p.linkedin,
    notable: true,
  }))
  const team: Person[] = TEAM.map((m) => ({
    id: m.id,
    name: m.name,
    headline: m.title,
    detail: m.focus,
    group: 'team',
    linkedin: m.linkedin,
    notable: true,
  }))
  const notableNames = new Set(NOTABLE_PEOPLE.map((p) => p.name))
  const founders: Person[] = COHORT_STARTUPS.flatMap((s) =>
    s.founders
      .filter((f) => !notableNames.has(f))
      .map((f, i) => ({
        id: `founder-${s.name}-${i}`,
        name: f,
        headline: `Founder of ${s.name} (cohort ${s.cohort})`,
        detail: s.note ?? `Built ${s.name} through Accelerate ME cohort ${s.cohort}.`,
        group: 'cohort' as const,
        notable: false,
      })),
  )
  const rand = mulberry32(2626)
  const generated: Person[] = []
  const target = PEOPLE_SIZE - notable.length - team.length - founders.length
  while (generated.length < target) {
    const name = `${pick(rand, FIRST)} ${pick(rand, LAST)}`
    const cofounder = rand() < 0.35
    generated.push({
      id: `gen-p-${generated.length}`,
      name,
      headline: cofounder
        ? `${pick(rand, DEGREES)} @ ${pick(rand, UNIS)} · open to co-founding`
        : `${pick(rand, DEGREES)} @ ${pick(rand, UNIS)} · AME community`,
      detail: `Cohort ${1 + Math.floor(rand() * 13)} community — ${pick(rand, PROOFS)}.`,
      group: cofounder ? 'cofounder' : 'cohort',
      notable: false,
    })
  }
  peopleCache = [...notable, ...team, ...founders, ...generated]
  return peopleCache
}
