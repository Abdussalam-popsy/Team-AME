# Startup Graveyard + Founder OS — architecture

Accelerate Me (AMe) is a student-led accelerator with 12 years of cohorts, alumni, mentors and
investor relationships. Every hackathon creates startups that die within weeks. The graveyard turns
that dead inventory into matched, actionable revivals using the one asset AMe already has that
nobody else does: the talent database.

## The loop

```
bury (startup or unbuilt idea)
  → Founder OS diagnoses gaps
    → each gap resolves to a named person (talent DB) or capital route (investor DB)
      → 3 next moves + a revival milestone
        → milestone hit → status flips to "reviving" → AMe Student Seed Pool
```

## Modules

| Path | Responsibility |
| --- | --- |
| `src/lib/types.ts` | Domain model: `Startup`, `TalentProfile`, `Investor`, `Gap`, `Diagnosis`. |
| `src/data/talent.ts` | The AMe talent database (seed slice, 12 profiles). Founder OS matches against it. |
| `src/data/investors.ts` | Investors and non-dilutive routes, each with the AMe owner of the warm intro. |
| `src/data/startups.ts` | Seeded graves — real hackathon failure patterns, anonymised. |
| `src/lib/founderOs.ts` | The engine. Rules → gaps → matched humans → revival score → next moves. |
| `src/lib/storage.ts` | `localStorage` persistence: submitted graves + status overrides, merged over seeds. |
| `src/pages/*` | Graveyard grid, bury form, grave detail (diagnosis), talent database browser. |

## Founder OS: the diagnosis engine

`diagnose(startup): Diagnosis` is pure and synchronous — deterministic, explainable, demoable
offline. It is deliberately not an LLM call: a founder being told their startup is dead deserves a
reason they can audit, and judges deserve a system that cannot hallucinate a cofounder.

Rules, in the order they kill a company:

| Gap | Trigger | Severity | Resolves to |
| --- | --- | --- | --- |
| No one can build it | no `cto`/`engineer`/`data` role | critical | cofounder-available engineers in-sector |
| No one is selling it | no `ceo`/`sales`/`growth` role | critical | commercial cofounders |
| Solo founder | `teamSize === 1` | critical | cofounder matches, paid trial before equity |
| No insider credibility | sector needs `domain` (health/fintech/climate/deeptech) and it is absent | major | AMe mentors as advisors |
| Built, but nobody came | past `idea` stage with `< 50` users | major | growth + design contractors |
| Zero runway | `runwayMonths === 0` and never raised | major if revenue, else minor | stage+sector matched investors, grants first |
| Cofounder wreckage | `causeOfDeath === 'cofounder-split'` | major | ops advisors, cap-table cleanup |
| Flying blind | `> 500` users and no `data` role | minor | data contractors/interns |

Talent matching (`matchTalent`) scores each profile: `+3` per overlapping role, `+2` for sector
match, `+2` for the availability the gap actually needs (a cofounder gap should not surface an
intern). Threshold `>= 5`, top 3 shown, so a match is never a coincidence of one weak signal.

**Revival score** = `100 − Σ severity cost (critical 24 / major 12 / minor 5) + evidence bonus`
(`+6` any users, `+10` any revenue), floored at 8. Evidence of demand outranks a tidy team: a
solo founder with paying users scores above a complete team with nobody using the product.

## Deliberate choices

- **Emotional surface, blunt content.** Graves, epitaphs, causes of death. Six form fields, one
  screen of diagnosis, three moves. A founder revisiting a failure will not complete a 20-field
  intake.
- **Named people, not advice.** "You need a technical cofounder" is worthless. "Message Amara
  (@amara.ok), open to cofounding, built the model behind Cohort 9's winner" is the product.
- **Client-side only.** No backend, no accounts, no data leaving the browser — a graveyard of
  failures is sensitive, and it also means the demo cannot fail on stage. The talent and investor
  tables are typed modules, so swapping them for the real AMe API is one adapter, not a rewrite.
- **Grants before equity.** Where there is no revenue, Founder OS routes to non-dilutive money
  rather than pricing a dead cap table.

## Next (not in this cut)

- Replace `src/data/*.ts` with the live AMe database behind `src/lib/api.ts`; keep `diagnose()` pure.
- Two-sided consent: talent opt-in per gap type before a founder sees a handle.
- Revival ledger: track milestones over time so "raised from the dead" is a measured statistic, not
  a status field.
