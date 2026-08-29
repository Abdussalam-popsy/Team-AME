# Startup Graveyard 🪦 — by Accelerate Me

Every hackathon leaves a graveyard. This one has an exit.

Bury a dead startup — or an idea that was never built — and **Founder OS** acts as the CEO the team
never hired: it names exactly what is missing, then pulls the specific person out of the Accelerate
Me talent database (12 years of cohorts, alumni and mentors) who fixes it, plus the capital route
that fits the stage.

- **Graveyard** — every grave with a revival score, filterable by buried / dormant / reviving.
- **Bury an idea** — six fields, then an instant diagnosis.
- **Founder OS diagnosis** — gaps ranked by what kills you first, each with named matches and a
  concrete prescription.
- **Next three moves** — nothing else matters until those are done, ending in one revival milestone.
- **Talent database** — searchable by skill, sector and availability.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the domain model and the full Founder OS rule set, and
[docs/DEADSTART.md](./docs/DEADSTART.md) for the product spec: the Deadstart pitch, the data we
collect, revival paths and metrics.

## Run it

Requires **Node 22+** (the Vite 8 / rolldown toolchain does not run on Node 20).

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run lint     # oxlint
npm run build    # tsc -b && vite build
npm run preview  # serve dist/
```

## Stack

React 19 + TypeScript + Vite, `react-router-dom` (hash routing so it deploys to any static host),
hand-written CSS, no backend. Submitted graves persist in `localStorage`; nothing leaves the browser.
