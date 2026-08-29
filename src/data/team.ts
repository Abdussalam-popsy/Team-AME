import type { TeamMember } from '../lib/types'

/**
 * The Accelerate Me team running Cohort 13. Details from their public
 * LinkedIn profiles and AMe's team announcement.
 */
export const TEAM: TeamMember[] = [
  {
    id: 'team-barnaby',
    name: 'Barnaby Pettifer',
    title: 'Director of AMe',
    headline: 'Director @ Accelerate ME · Operations @ Entrepreneurs First · Student at UoM',
    focus:
      'Runs Cohort 13 end to end. Previously a Programme Associate on the cohort that broke AMe application and attendance records.',
    helpWith: ['accelerator place', 'programme', 'investor intros', 'cohort selection'],
    linkedin: 'https://linkedin.com/in/barnaby-pettifer',
  },
  {
    id: 'team-ecem',
    name: 'Ecem Guvener',
    title: 'Head of Programme',
    headline:
      'Head of Programme @ AccelerateME · CS @ UoM + Scholar · Co-chair @ IBM Z · YC / HackEurope / ETH Oxford hackathon winner',
    focus:
      'Owns the cohort experience week to week: sessions, mentors and founder accountability. Ex system analyst, founding engineer of QuantumProofOps.',
    helpWith: ['programme', 'technical cofounder', 'hackathon strategy', 'accountability'],
    linkedin: 'https://linkedin.com/in/ecemguvener',
  },
  {
    id: 'team-abdussalam',
    name: 'Abdussalam Popoola',
    title: 'Head of Marketing',
    headline:
      'Head of Marketing @ Accelerate Me · CTO @ Luminocare · CS @ UoC · Founder in Residence @ Redwood Founders · 4x hackathon winner',
    focus:
      'Takes the accelerator to every campus — brand, content and applications. Builds as well as markets: design engineer and startup CTO.',
    helpWith: ['brand', 'landing pages', 'distribution', 'technical cofounder'],
    linkedin: 'https://linkedin.com/in/abdussalampopoola',
  },
  {
    id: 'team-nelson',
    name: 'Nelson Hamilton',
    title: 'Head of Growth',
    headline:
      'Head of Growth @ AccelerateME · Mechatronics Engineering @ UoM · ex-Team GB athlete · Student Ambassador @ IBM',
    focus:
      'Partnerships, pipeline and the numbers behind cohort growth. Turned a personal project into a paying client engagement; ex technical lead at IBM Z Society.',
    helpWith: ['growth', 'partnerships', 'first customers', 'events'],
    linkedin: 'https://linkedin.com/in/nelson-hamilton',
  },
]
