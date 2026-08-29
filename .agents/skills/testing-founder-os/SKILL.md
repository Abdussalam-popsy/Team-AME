---
name: testing-founder-os
description: How to run and E2E-test the Founder OS dashboard (VC + hiring research) in Team-AME
---

# Testing the Founder OS dashboard

## Start services
- Node 22 via nvm: `source ~/.nvm/nvm.sh && nvm use 22`
- API: `npx tsx server/index.ts` (port 3001; needs `.env` with OPENAI_API_KEY, TAVILY_API_KEY, DEEPLINE_API_KEY — never print them)
- Frontend: `npx vite` (port 5173, proxies `/api` to :3001)
- Health check: `curl http://localhost:3001/api/health` → `{"ok":true,"providers":{...}}`
- SQLite DB at `data/founder-os.sqlite`; saved runs persist across restarts and warm the provider cache.

## Cost control
- Keep "Pilot mode" checked; avoid "Force refresh" (re-bills real providers, ~$0.05–0.20/run). A cached re-run of identical inputs costs $0 and shows "N calls, N cached (free)".
- Spend meter text lives in `src/components/RunView.tsx` ("$X of $Y cap · … N calls, M cached (free)").

## Gotchas
- Finalist email resolution ("Resolve verified emails for N finalists") is gated on row selection, but the actual `peopledatalabs_enrich_contact` lookup may fail: when the row has no LinkedIn URL the payload sends `profile: undefined` → provider rejects with "profile: must be string" (`server/providers/deepline.ts` resolveEmail).
- Resolving emails on a run started more than 240s ago is refused with "run exceeded its 240s wall-clock ceiling" (run clock in `server/budget.ts`). Test resolution immediately after a run completes.
- The scored hiring candidate may only be `partial` on "Rust or Go"; the `met`-with-source candidate can be among the disqualified rows.
- VC drill-down may render a malformed firm URL like `https://https://primary.vc`.

## Devin Secrets Needed
- OPENAI_API_KEY, TAVILY_API_KEY, DEEPLINE_API_KEY (in repo `.env` for the server).
