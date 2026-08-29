import express from 'express';
import { z } from 'zod';
import { DEFAULT_BUDGET_USD, type HiringInput, type VcInput } from '../shared/types.js';
import { RUBRICS } from '../shared/rubric.js';
import { BudgetExceededError, remainingBudget } from './budget.js';
import { runHiringPipeline } from './pipeline/hiring.js';
import { runVcPipeline } from './pipeline/vc.js';
import { resolveEmail } from './providers/deepline.js';
import {
  createRun,
  getRowsByIds,
  getRun,
  isCancelled,
  listRuns,
  listToolCalls,
  setRowContact,
  setRunStatus,
  updateDraft,
  upsertStep,
} from './store.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

const vcInput = z.object({
  companyDescription: z.string().min(20),
  website: z.string().optional(),
  stage: z.string().min(2),
  roundSizeUsd: z.number().positive(),
  geography: z.string().min(2),
  sectorTags: z.array(z.string()).min(1),
  excludeFirms: z.array(z.string()).default([]),
});

const hiringInput = z.object({
  role: z.string().min(2),
  jobDescription: z.string().min(20),
  seniority: z.string().min(2),
  location: z.string().min(2),
  mustHaves: z.array(z.string()).default([]),
  niceToHaves: z.array(z.string()).default([]),
  compRangeUsd: z.tuple([z.number(), z.number()]),
});

const createRunBody = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('vc'),
    input: vcInput,
    budgetCapUsd: z.number().positive().optional(),
    pilot: z.boolean().default(true),
    forceRefresh: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal('hiring'),
    input: hiringInput,
    budgetCapUsd: z.number().positive().optional(),
    pilot: z.boolean().default(true),
    forceRefresh: z.boolean().default(false),
  }),
]);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    providers: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      tavily: Boolean(process.env.TAVILY_API_KEY),
      deepline: Boolean(process.env.DEEPLINE_API_KEY),
    },
  });
});

/** The rubric is shown in the UI so scores are readable against their weights. */
app.get('/api/rubrics', (_req, res) => res.json(RUBRICS));

app.post('/api/runs', (req, res) => {
  const parsed = createRunBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid input', detail: parsed.error.flatten() });
    return;
  }
  const { kind, input, pilot, forceRefresh } = parsed.data;
  const budgetCapUsd = parsed.data.budgetCapUsd ?? DEFAULT_BUDGET_USD[kind];
  const label =
    kind === 'vc'
      ? `${(input as VcInput).stage} round · ${(input as VcInput).sectorTags[0] ?? ''}`
      : (input as HiringInput).role;

  const runId = createRun({ kind, label, input, budgetCapUsd, pilot });
  res.status(202).json({ runId });

  void (async () => {
    setRunStatus(runId, 'running');
    try {
      if (kind === 'vc') {
        await runVcPipeline(runId, input as VcInput, pilot, forceRefresh);
      } else {
        await runHiringPipeline(runId, input as HiringInput, pilot, forceRefresh);
      }
      setRunStatus(runId, isCancelled(runId) ? 'cancelled' : 'done');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof BudgetExceededError) {
        // Partial results are kept: the run stops at the cap rather than
        // discarding the rows it already paid for.
        upsertStep(runId, 99, 'Budget cap reached', 'failed', message);
        setRunStatus(runId, 'done', message);
      } else {
        setRunStatus(runId, 'failed', message);
      }
    }
  })();
});

app.get('/api/runs', (_req, res) => res.json(listRuns()));

app.get('/api/runs/:id', (req, res) => {
  const run = getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json({ ...run, toolCalls: listToolCalls(run.id), remainingUsd: remainingBudget(run.id) });
});

app.post('/api/runs/:id/cancel', (req, res) => {
  const run = getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  setRunStatus(run.id, 'cancelled');
  res.json({ ok: true });
});

const finalistsBody = z.object({ rowIds: z.array(z.string()).min(1).max(10) });

/** Verified emails are resolved only for rows a human picked. */
app.post('/api/runs/:id/finalists', async (req, res) => {
  const run = getRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const parsed = finalistsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid input' });
    return;
  }

  const rows = getRowsByIds(run.id, parsed.data.rowIds);
  const results: { rowId: string; email?: string; verification: string; error?: string }[] = [];

  for (const row of rows) {
    if (row.disqualified) {
      results.push({ rowId: row.id, verification: 'skipped (disqualified)' });
      continue;
    }
    const [firstName, ...rest] = row.name.split(/\s+/);
    const company =
      'firm' in row.detail ? row.detail.firm.name : row.detail.person.company;
    try {
      const contact = await resolveEmail(
        {
          firstName,
          lastName: rest.join(' '),
          company,
          linkedinUrl:
            'person' in row.detail ? row.detail.person.links[0] : row.detail.partner.linkedinUrl,
        },
        { runId: run.id },
      );
      if (contact.email) setRowContact(row.id, { email: contact.email, verification: contact.verification });
      results.push({ rowId: row.id, ...contact });
    } catch (err) {
      results.push({
        rowId: row.id,
        verification: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  res.json({ results, spendUsd: getRun(run.id)?.spendUsd ?? 0 });
});

const draftBody = z.object({ draftSubject: z.string(), draftBody: z.string() });

app.patch('/api/rows/:id', (req, res) => {
  const parsed = draftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid input' });
    return;
  }
  const ok = updateDraft(req.params.id, parsed.data.draftSubject, parsed.data.draftBody);
  res.status(ok ? 200 : 404).json({ ok });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`founder-os api on :${port}`);
});
