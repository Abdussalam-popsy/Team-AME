# Deadstart — product documentation

> A hackathon should not be where an idea ends. It should be where its second life begins.

Deadstart is the layer that catches what hackathons throw away. Every dead project gets a profile,
an autopsy, and a route back to life: a cofounder, a first customer, a mentor, a pilot, an
accelerator place, or a new owner.

This document is the working spec: what the product is, the data it holds, how the undertaker
reaches a verdict, and which numbers tell us it works. It describes both what already runs in this
repo (`Startup Graveyard + Founder OS`, see [ARCHITECTURE.md](../ARCHITECTURE.md)) and what
Deadstart adds on top.

---

## 1. The problem

A hackathon weekend produces real software, real teams, real research, real customer conversations
and real cloud credits. Then prizes are handed out, everyone goes home, and on Monday most of it is
never opened again. The asset is not the idea — it is everything that was assembled around the idea:

| Asset created in 12–48h | What happens to it today |
| --- | --- |
| Working code | Private repo, never touched again |
| A team that ships together | Dissolves back into coursework |
| Customer conversations | Lost with the notes app |
| Research / domain insight | Never written down |
| Cloud + API credits | Expire unused |
| Early users | Churn in a week |

Hackathons may be the fastest startup factories in the world. They are also the largest startup
graveyards. Nobody owns the graveyard, so nothing is recycled.

## 2. What Deadstart is

Four surfaces, one loop.

```
1. BURY      founder submits a dead project → a grave profile
2. AUTOPSY   the undertaker names the cause of death + what is missing
3. MATCH     each missing thing resolves to a named person, fund or programme
4. REVIVE    someone claims it: join / fund / mentor / pilot / accelerate / take over
                 → milestone hit → status flips to "reviving"
```

### 2.1 The grave profile

Every dead startup gets a page answering: what was built, who built it, what tech exists, which
customers were spoken to, what credits are left, what the team learned, and **why it died**.

### 2.2 The undertaker (autopsy)

The undertaker reads the profile and returns a verdict, not vibes: a ranked list of gaps, each with
a diagnosis, a prescription, and named humans who close it. Today this is a deterministic rule
engine (`diagnose()` in `src/lib/founderOs.ts`) — auditable, offline, and incapable of inventing a
cofounder. See §4.

### 2.3 Revival paths

A gap is only useful if someone on the other side can act on it.

| What the startup needs | Who acts | What they get |
| --- | --- | --- |
| Technical cofounder | Builder looking for a real project | A product with users on day one |
| Commercial cofounder | Student who sells | Traction to own, not a blank page |
| First customer / pilot | Company, society, university dept | Cheap access to novel software |
| Mentor / advisor | Alumnus, operator | 0.25–0.5% for real influence |
| Funding | Grant body, angel, seed pool | Deal flow with evidence attached |
| A new owner | Anyone, when founders have moved on | An asset transfer, not a cold start |

### 2.4 Swipe discovery

Discovery is a stack of cards: what they built, why it died, what it still needs. Swipe past, or
claim it. This is deliberately a game — the scarce resource is not dead startups, it is attention
from people capable of reviving one.

## 3. Data model

### 3.1 Implemented today (`src/lib/types.ts`)

```ts
Startup        // the grave: sector, stage, status, epitaph, causeOfDeath, team, users, revenue, runway
TalentProfile  // who can revive it: roles, skills, sectors, availability, cohort, proof
Investor       // capital routes: stages, sectors, cheque, thesis, warmIntroVia
Gap            // one thing that is missing: severity, diagnosis, prescription, talent[], investors[]
Diagnosis      // revivalScore, verdict, gaps[], nextThreeMoves[]
```

### 3.2 Proposed additions for Deadstart

The pitch promises fields the current model does not carry yet. Proposed shape — additive, so
`diagnose()` stays pure:

```ts
interface Autopsy {
  builtIn: string            // "36h, Manchester Hack 2026"
  artifacts: Artifact[]      // repo, demo video, deck, research doc, landing page
  stack: string[]            // ['nextjs', 'supabase', 'openai']
  customerConversations: {
    count: number
    segments: string[]       // ['NHS trusts', 'student societies']
    strongestSignal: string  // the one quote that mattered
  }
  creditsRemaining: {
    provider: string         // 'aws' | 'gcp' | 'openai' | ...
    valueGbp: number
    expiresAt: string        // ISO date — credits are a decaying asset
  }[]
  lessons: string[]          // what the team would do differently
  ownerIntent: 'handing-over' | 'open-to-help' | 'still-mine'
  contactableUntil?: string  // consent has an expiry
}

interface RevivalOffer {          // the other side of the marketplace
  id: string
  startupId: string
  fromProfileId: string
  kind: 'join' | 'fund' | 'mentor' | 'pilot' | 'accelerate' | 'take-over'
  gapId: string                   // which Gap this offer answers
  message: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  createdAt: string
}

interface RevivalMilestone {      // makes "revived" measurable, not a status field
  startupId: string
  claim: string                   // "10 paying users in 30 days"
  dueAt: string
  evidenceUrl?: string
  met?: boolean
}
```

### 3.3 Cause of death taxonomy

The single most valuable column in the dataset, because it is the one no other database has.

`cofounder-split` · `no-technical-cofounder` · `ran-out-of-money` · `no-users` · `graduated` ·
`lost-momentum` · `never-started`

Founder-declared cause and undertaker-inferred cause are stored separately. Where they disagree is
where the interesting data is — e.g. teams that report `lost-momentum` while the model reads
`no-users`.

## 4. How the autopsy works

Full rule table lives in [ARCHITECTURE.md](../ARCHITECTURE.md#founder-os-the-diagnosis-engine).
Summary: eight rules fire in the order they kill a company (no builder → no seller → solo founder →
no domain credibility → no distribution → no runway → cofounder wreckage → no data), each producing
a `Gap` with matched people.

```
revivalScore = 100 − Σ severity cost (critical 24 / major 12 / minor 5)
                   + evidence bonus (users +6, revenue +10), floored at 8
```

Evidence of demand outranks a tidy team: a solo founder with paying users scores above a complete
team nobody uses.

**Why rules before an LLM.** A founder told their startup is dead deserves a reason they can audit,
and a demo should not be able to hallucinate a cofounder. The intended path is a hybrid: rules own
the verdict and the matching, an LLM writes the narrative autopsy and normalises messy free-text
submissions into the fields above.

## 5. The data we collect (and why it compounds)

Deadstart is the only place where a project's *post-mortem* is structured. Every event below is a
row worth having:

| Event | Fields | Why it matters |
| --- | --- | --- |
| `grave_submitted` | sector, stage, cause, teamSize, users, revenue, hours built | Base rate of how hackathon startups die |
| `autopsy_returned` | gaps[], revivalScore, inferred vs declared cause | Trains the model; audits the rules |
| `card_swiped` | startupId, direction, dwell time, viewer role | What makes a dead startup attractive |
| `offer_made` | kind, gapId, from role | Which gaps the market actually fills |
| `offer_accepted` | time-to-match | Core marketplace health |
| `milestone_met` | claim, days elapsed | Proof a revival is real |

After one cohort of hackathons this is a dataset nobody else has: **which failure modes are
recoverable, and what it took**. That is the defensible asset — and the reason accelerators,
universities and hackathon sponsors are the natural buyers.

## 6. Metrics

- **North star:** revivals — a startup that accepted an offer *and* met its first milestone.
- **Funnel:** graves submitted → autopsies viewed → cards swiped → offers made → offers accepted →
  milestones met.
- **Marketplace health:** median time from grave to first offer; share of gaps with ≥1 named match;
  supply/demand ratio per gap type.
- **Quality:** 30-day survival of revived startups vs. control (graves with no offer).
- **Counter-metric:** offers per active reviver — the graveyard must not become spam.

## 7. Status

| Piece | State |
| --- | --- |
| Grave list, grave detail, bury form | Built (`src/pages/*`) |
| Deterministic autopsy + talent/investor matching | Built (`src/lib/founderOs.ts`) |
| Talent + investor databases | Seeded (`src/data/*.ts`) |
| Team page | Built (`src/pages/Team.tsx`) |
| Autopsy fields (§3.2), offers, milestones | Spec only |
| Swipe discovery | Spec only |
| LLM narrative autopsy + free-text intake | Spec only |
| Persistence beyond `localStorage`, accounts, consent | Not started |

## 8. Open questions

1. **Consent and ownership.** Who may list a dead startup — any team member, or all of them? What is
   assigned when a project is taken over (code, name, users)? A one-page IP hand-over is a product
   feature, not paperwork we can defer.
2. **Two-sided consent for talent.** Handles are shown from a seeded database today. Real people must
   opt in per gap type before a founder sees contact details.
3. **Cold start.** Graves are worthless without revivers. First distribution wedge is a single
   hackathon's alumni + one accelerator cohort, not the open internet.
4. **Incentives to be honest.** A truthful autopsy is embarrassing. Anonymised-until-matched profiles
   may be the only way to get real causes of death.
5. **Where the money is.** Sponsored revival pools, accelerator deal-flow subscriptions, or a success
   fee on takeovers — untested.
