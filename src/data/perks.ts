import type { Perk } from '../lib/types'

/**
 * Credits and tools a team can still claim after the hackathon ends.
 * Codes are the ones handed out at the event — expiry matters, credits decay.
 */
export const PERKS: Perk[] = [
  {
    id: 'perk-deepline',
    provider: 'Deepline',
    offer: 'Free credits',
    code: 'RUNNINGHACK',
    howTo: 'Apply the code at sign-up.',
    expires: 'The day after the event',
    url: 'https://deepline.ai',
  },
  {
    id: 'perk-tavily',
    provider: 'Tavily',
    offer: '8,000 credits',
    code: 'RUNTAVILY',
    howTo:
      'Sign up free at tavily.com (1,000 credits), then Dashboard → Coupon → Apply to add 8,000 more.',
    url: 'https://tavily.com',
  },
]
