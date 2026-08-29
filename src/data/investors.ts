import type { Investor } from '../lib/types'

/**
 * Investors and non-dilutive routes Accelerate Me has an actual path into.
 * `warmIntroVia` is the AMe person who owns the relationship.
 */
export const INVESTORS: Investor[] = [
  {
    id: 'v-firstcheque',
    name: 'First Cheque Collective',
    stages: ['idea', 'prototype'],
    sectors: ['ai', 'consumer', 'marketplace', 'edtech'],
    cheque: '£15k–£50k',
    thesis: 'Pre-product student founders. Backs the team, not the deck.',
    warmIntroVia: 'AMe partnerships lead',
  },
  {
    id: 'v-northloop',
    name: 'North Loop Ventures',
    stages: ['prototype', 'launched'],
    sectors: ['fintech', 'marketplace'],
    cheque: '£150k–£500k',
    thesis: 'UK fintech infrastructure. Wants a live pilot before term sheet.',
    warmIntroVia: 'AMe alumni angel (Cohort 7)',
  },
  {
    id: 'v-vitalis',
    name: 'Vitalis Health Fund',
    stages: ['prototype', 'launched', 'revenue'],
    sectors: ['healthtech'],
    cheque: '£250k–£1m',
    thesis: 'Clinician-founded or clinician-advised only. Evidence over vision.',
    warmIntroVia: 'AMe mentor Dr Sofia Marchetti',
  },
  {
    id: 'v-terrafirma',
    name: 'Terra Firma Climate',
    stages: ['idea', 'prototype', 'launched'],
    sectors: ['climate', 'deeptech'],
    cheque: '£100k–£750k',
    thesis: 'Hardware-heavy decarbonisation. Comfortable with long R&D.',
    warmIntroVia: 'AMe climate track mentor',
  },
  {
    id: 'v-innovateuk',
    name: 'Innovate UK Smart Grant (non-dilutive)',
    stages: ['idea', 'prototype'],
    sectors: ['climate', 'deeptech', 'healthtech', 'ai'],
    cheque: '£25k–£500k grant',
    thesis: 'No equity. Needs a technical work plan and UK-based delivery.',
    warmIntroVia: 'AMe grants clinic (Priya Nair)',
  },
  {
    id: 'v-studentseed',
    name: 'AMe Student Seed Pool',
    stages: ['idea', 'prototype', 'launched', 'revenue'],
    sectors: ['ai', 'fintech', 'healthtech', 'climate', 'consumer', 'edtech', 'deeptech', 'marketplace'],
    cheque: '£5k–£25k',
    thesis: 'Internal pool for revived cohort companies that hit a revival milestone.',
    warmIntroVia: 'AMe investment committee',
  },
]
