export type Sector =
  | 'ai'
  | 'fintech'
  | 'healthtech'
  | 'climate'
  | 'consumer'
  | 'edtech'
  | 'deeptech'
  | 'marketplace'

export type Stage = 'idea' | 'prototype' | 'launched' | 'revenue'

export type Status = 'buried' | 'dormant' | 'reviving'

export type Role =
  | 'ceo'
  | 'cto'
  | 'engineer'
  | 'designer'
  | 'growth'
  | 'sales'
  | 'ops'
  | 'data'
  | 'domain'

export type CauseOfDeath =
  | 'cofounder-split'
  | 'no-technical-cofounder'
  | 'ran-out-of-money'
  | 'no-users'
  | 'graduated'
  | 'lost-momentum'
  | 'never-started'

export interface Startup {
  id: string
  name: string
  tagline: string
  sector: Sector
  stage: Stage
  status: Status
  epitaph: string
  causeOfDeath: CauseOfDeath
  diedAt: string
  teamSize: number
  rolesPresent: Role[]
  users: number
  monthlyRevenueGbp: number
  runwayMonths: number
  hasRaised: boolean
  submittedBy: string
  hackathon?: string
}

export type Availability = 'cofounder' | 'advisor' | 'contract' | 'intern'

export interface TalentProfile {
  id: string
  name: string
  headline: string
  roles: Role[]
  skills: string[]
  sectors: Sector[]
  university: string
  availability: Availability
  cohort: string
  handle: string
  proof: string
}

export interface TeamMember {
  id: string
  name: string
  title: string
  focus: string
  linkedin: string
}

export interface Investor {
  id: string
  name: string
  stages: Stage[]
  sectors: Sector[]
  cheque: string
  thesis: string
  warmIntroVia: string
}

export type Severity = 'critical' | 'major' | 'minor'

export interface Gap {
  id: string
  title: string
  severity: Severity
  diagnosis: string
  prescription: string
  talent: TalentProfile[]
  investors: Investor[]
}

export interface Diagnosis {
  revivalScore: number
  verdict: string
  gaps: Gap[]
  nextThreeMoves: string[]
}
