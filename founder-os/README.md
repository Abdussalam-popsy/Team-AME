# Founder OS

Internal dashboard for two founder workflows: finding the right VCs to raise from, and finding
the right candidates to hire. Both produce a ranked, evidence-backed shortlist with a
personalized outreach draft per row.

Every value shown in the UI traces to a stored evidence row with its source. Nothing is asserted
because a model believed it.

## Running it

```bash
npm install
cp .env.example .env    # then fill in the three keys
npm run dev             # api on :3001, ui on :5173
```

Keys are read only by the API process; the browser never sees them.

| Variable | Used for |
| --- | --- |
| `OPENAI_API_KEY` | query planning, rubric scoring, outreach drafting |
| `TAVILY_API_KEY` | VC thesis research, candidate public background |
| `DEEPLINE_API_KEY` | Aviato firm/investment data, Crustdata people search, finalist emails |
| `FOUNDER_OS_DB` | SQLite path (default `data/founder-os.sqlite`) |

## How a run works

1. **Discovery** — search + structured extraction produce candidate entities, never from model
   background knowledge.
2. **Enrichment** — structured provider data (a firm's actual investments, a person's actual
   employment history) plus one narrative research lookup per entity. Each fact is stored as an
   `evidence` row with its source URL.
3. **Deterministic disqualification** — stage mismatch, direct portfolio conflict, location
   mismatch, or a missing hard must-have removes a row *in code*, before any scoring. Disqualified
   rows never reach a model: no score, no rubric, no draft, no spend.
4. **Weighted rubric scoring** — the model is given only that entity's evidence rows and must
   return a sub-score plus the evidence IDs it used for every criterion. Weights live in
   `shared/rubric.ts` and are displayed in the UI.
5. **Outreach drafting** — the draft must name a fact specific to the recipient; if it doesn't,
   it is rewritten once and flagged if it still doesn't.
6. **Finalist emails** — resolved only for rows a human ticks, because they bill per lookup.

A hiring must-have is `met` only with a citable source: structured employment data, the
candidate's own title/headline, or a public page that mentions the term near their name. Our
Crustdata account cannot return skill lists, so a provider skill-filter match proves only that one
of several skills is listed somewhere — it stays `partial` when public search turns up nothing, and
an attempted corroboration that came back empty never promotes it.

Two guards sit at the persistence boundary. A field in `detail_json` with no matching evidence row
is written as `unknown` rather than persisted, and model-returned evidence IDs are validated
against the stored IDs.

## Cost control

Each run has a hard cap (`$2` VC, `$5` hiring) enforced from recorded per-call costs, and a 240s
wall-clock ceiling; hitting either stops the run and keeps the partial results already paid for.
Every provider call has a bounded timeout (Deepline 60s, OpenAI 45s, Tavily 20s) and retries once
on a transient failure only, so no single call can stall a run. Every provider call is cached by
`provider + tool + normalized input hash`:

| Cached work | TTL |
| --- | --- |
| Entity resolution | 30 days |
| Portfolio / investments / financing events | 7 days |
| People search and hiring signals | 24 hours |
| Tavily research | 7 days |
| Verified emails | 30 days |
| Scoring and drafts | per row, until regenerated |

Reopening a saved run reads SQLite and costs nothing. A rerun inside TTL is a cache hit;
`forceRefresh` is the only way to re-bill.

## Layout

```
server/providers   provider clients: cost recording, caching, timeouts
server/pipeline    the two workflows
server/scoring     disqualification, rubric scoring, evidence gate
server/store.ts    SQLite reads/writes
shared/            types and rubric weights, shared with the UI
src/               dashboard
```

## Scripts

```bash
npm run typecheck
npm run lint
npm run build
```

## Not in scope

Auth, multi-tenancy, CRM status tracking, sending email, ATS/CRM integrations, mobile, billing.
