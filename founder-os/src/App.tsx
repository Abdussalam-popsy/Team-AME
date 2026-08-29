import { useCallback, useEffect, useState } from 'react';
import type { HiringInput, RunKind, RunSummary, VcInput } from '../shared/types.js';
import type { RubricCriterion } from '../shared/rubric.js';
import { api, usd, type RunDetailResponse } from './api.js';
import { RunForm } from './components/RunForm.js';
import { RunView } from './components/RunView.js';

const POLL_MS = 2000;

export function App() {
  const [kind, setKind] = useState<RunKind>('vc');
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [run, setRun] = useState<RunDetailResponse | null>(null);
  const [rubrics, setRubrics] = useState<Record<RunKind, RubricCriterion[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const refreshRuns = useCallback(() => {
    api.listRuns().then(setRuns).catch((e: Error) => setError(e.message));
  }, []);

  const loadRun = useCallback((id: string) => {
    api.getRun(id).then(setRun).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    refreshRuns();
    api.rubrics().then(setRubrics).catch(() => undefined);
  }, [refreshRuns]);

  // Reopening a saved run is a pure SQLite read and costs nothing, so polling
  // only continues while the run is actually in flight.
  useEffect(() => {
    if (!run || (run.status !== 'running' && run.status !== 'queued')) return;
    const t = setInterval(() => {
      loadRun(run.id);
      refreshRuns();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [run, loadRun, refreshRuns]);

  const start = (input: VcInput | HiringInput, pilot: boolean, forceRefresh: boolean) => {
    setStarting(true);
    setError(null);
    api
      .createRun({ kind, input, pilot, forceRefresh })
      .then(({ runId }) => {
        loadRun(runId);
        refreshRuns();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setStarting(false));
  };

  return (
    <div className="app">
      <header className="top">
        <h1>Founder OS</h1>
        <nav>
          {(['vc', 'hiring'] as RunKind[]).map((k) => (
            <button
              key={k}
              type="button"
              className={kind === k ? 'tab active' : 'tab'}
              onClick={() => setKind(k)}
            >
              {k === 'vc' ? 'VC research' : 'Hiring'}
            </button>
          ))}
        </nav>
      </header>

      {error ? <p className="dq">{error}</p> : null}

      <RunForm kind={kind} busy={starting} onStart={start} />

      {rubrics ? (
        <details className="card">
          <summary>
            Rubric for {kind === 'vc' ? 'VC research' : 'hiring'} — scores are weighted, not vibes
          </summary>
          <ul className="history">
            {rubrics[kind].map((c) => (
              <li key={c.key}>
                <strong>
                  {c.label} · {Math.round(c.weight * 100)}%
                </strong>
                <span className="src"> {c.guidance}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {run ? <RunView run={run} onRefresh={() => loadRun(run.id)} /> : null}

      <section className="card">
        <h3>Saved runs</h3>
        {runs.length === 0 ? (
          <p className="src">No runs yet.</p>
        ) : (
          <table className="results">
            <thead>
              <tr>
                <th>When</th>
                <th>Workflow</th>
                <th>Label</th>
                <th>Status</th>
                <th>Spend</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{r.createdAt}</td>
                  <td>{r.kind === 'vc' ? 'VC' : 'Hiring'}</td>
                  <td>{r.label}</td>
                  <td>
                    <span className={`badge ${r.status === 'failed' ? 'danger' : 'ok'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {usd(r.spendUsd)} / {usd(r.budgetCapUsd)}
                  </td>
                  <td>
                    <button type="button" onClick={() => loadRun(r.id)}>
                      Open (free)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
