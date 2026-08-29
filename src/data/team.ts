import type { TeamMember } from '../lib/types'

/**
 * The Accelerate ME team running Cohort 13. Details from their public
 * LinkedIn profiles and AME's team announcement.
 */
export const TEAM: TeamMember[] = [
  {
    id: 'team-barnaby',
    name: 'Barnaby Pettifer',
    title: 'Director of AME',
    headline: 'Director @ Accelerate ME · Operations @ Entrepreneurs First · Student at UoM',
    focus:
      'Runs Cohort 13 end to end. Previously a Programme Associate on the cohort that broke AME application and attendance records.',
    achievement:
      "Directs the UK's leading student-led accelerator — 210+ founders supported, £65m+ in follow-on funding raised by alumni.",
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
    achievement:
      'Winner of YC, HackEurope and ETH Oxford hackathons; founding engineer of QuantumProofOps.',
    helpWith: ['programme', 'technical cofounder', 'hackathon strategy', 'accountability'],
    linkedin: 'https://linkedin.com/in/ecemguvener',
  },
  {
    id: 'team-nelson',
    name: 'Nelson Hamilton',
    title: 'Head of Growth',
    headline:
      'Head of Growth @ AccelerateME · Mechatronics Engineering @ UoM · ex-Team GB athlete · Student Ambassador @ IBM',
    focus:
      'Partnerships, pipeline and the numbers behind cohort growth. Turned a personal project into a paying client engagement; ex technical lead at IBM Z Society.',
    achievement:
      'Ex-Team GB athlete; turned a personal project into a paying client engagement while leading IBM Z Society tech.',
    helpWith: ['growth', 'partnerships', 'first customers', 'events'],
    linkedin: 'https://linkedin.com/in/nelson-hamilton',
  },
  {
    id: 'team-abdussalam',
    name: 'Abdussalam Popoola',
    title: 'Head of Marketing',
    headline:
      'Head of Marketing @ Accelerate ME · CTO @ Luminocare · CS @ UoC · Founder in Residence @ Redwood Founders · 4x hackathon winner',
    focus:
      'Takes the accelerator to every campus — brand, content and applications. Builds as well as markets: design engineer and startup CTO.',
    achievement:
      '4x hackathon winner and startup CTO (Luminocare) while running marketing for the accelerator.',
    helpWith: ['brand', 'landing pages', 'distribution', 'technical cofounder'],
    linkedin: 'https://linkedin.com/in/abdussalampopoola',
  },
  {
    id: 'team-faisal',
    name: 'Faisal Lawan',
    title: 'Programme Associate',
    headline:
      'Programme Associate @ Accelerate ME · Doctoral Researcher (Robotics) @ UoM · BEng Mechatronics, top in EEE · ex-FPGA Design Engineer @ Intel/Altera · 5x hackathon winner',
    focus:
      'Runs Cohort 13 alongside the director — sessions, founder logistics and the deep-tech side of the room. Hardware and robotics engineer by training, so he can pressure-test a technical build.',
    achievement:
      'Shipped a duplicate-MAC search algorithm at Intel that was 1000% more efficient than the legacy design, and an FPGA Snappy compression block 30% faster than software; 5x hackathon winner.',
    helpWith: ['deep tech', 'hardware and robotics', 'technical validation', 'programme'],
    linkedin: 'https://www.linkedin.com/in/faisal-lawan/',
  },
]
