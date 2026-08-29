import type { HiringInput, VcInput } from '../shared/types.js';

/** The locked demo case: one company, both workflows. */
export const FERNBACK_VC: VcInput = {
  companyDescription:
    'Fernback builds AI-powered dispatch and route optimization software for regional trucking ' +
    'fleets. We integrate with existing TMS platforms to cut idle miles and reduce driver ' +
    'overtime. Currently at $340K ARR with 6 paying fleet customers.',
  website: 'fernback.io',
  stage: 'seed',
  roundSizeUsd: 2_000_000,
  geography: 'United States',
  sectorTags: ['logistics tech', 'vertical SaaS', 'supply chain', 'B2B AI'],
  excludeFirms: [],
};

export const FERNBACK_HIRING: HiringInput = {
  role: 'Founding Backend Engineer',
  jobDescription:
    'Fernback is hiring a founding backend engineer to own our routing/optimization engine. ' +
    "You'll work directly with the founders building the core dispatch algorithm and TMS " +
    'integrations. Early-stage, high ownership, comfortable with ambiguity.',
  seniority: 'senior (5+ years)',
  location: 'Remote (US)',
  mustHaves: [
    'backend systems experience',
    'Rust or Go',
    'worked at an early-stage startup (pre-seed to Series A)',
  ],
  niceToHaves: [
    'logistics or supply chain domain experience',
    'distributed systems / optimization algorithms',
    'prior founding engineer role',
  ],
  compRangeUsd: [140_000, 170_000],
};
