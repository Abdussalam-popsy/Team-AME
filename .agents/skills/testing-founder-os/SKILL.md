---
name: testing-founder-os
description: How to run and E2E-test the Founder OS dashboard (VC + hiring research) in Team-AME
---

# Testing the Founder OS dashboard

## Start services
- Founder OS lives in `founder-os/` (the repo root hosts the Deadstart app) — run everything from that directory.
- Node 22 via nvm: `source ~/.nvm/nvm.sh && nvm use 22`
- API: `npx tsx server/index.ts` (port 3001; needs `.env` with OPENAI_API_KEY, TAVILY_API_KEY, DEEPLINE_API_KEY — never print them)
- Frontend: `npx vite` (port 5173, proxies `/api` to :3001)
- Health check: `curl http://localhost:3001/api/health` → `{"ok":true,"providers":{...}}`
- SQLite DB at `data/founder-os.sqlite`; saved runs persist across restarts and warm the provider cache.

## Cost control
- Keep "Pilot mode" checked; avoid "Force refresh" (re-bills real providers, ~$0.05–0.20/run). A cached re-run of identical inputs costs $0 and shows "N calls, N cached (free)".
- Spend meter text lives in `src/components/RunView.tsx` ("$X of $Y cap · … N calls, M cached (free)").

## Gotchas
- Finalist email resolution ("Resolve verified emails for N finalists") is gated on explicit row selection and bills a real `peopledatalabs_enrich_contact` call per finalist.
- The scored hiring candidate may only be `partial` on "Rust or Go"; the `met`-with-source candidate can be among the disqualified rows — this is the corroboration rule working, not a bug.

## Devin Secrets Needed
- OPENAI_API_KEY, TAVILY_API_KEY, DEEPLINE_API_KEY (in repo `.env` for the server).
