import { Fragment, useState } from 'react';
import type { ResultRow } from '../../shared/types.js';
import { api, usd, type FinalistResult, type RunDetailResponse } from '../api.js';
import { RowDetail } from './RowDetail.js';

function headlineCells(row: ResultRow): string[] {
  return Object.values(row.headline);
}

export function RunView({ run, onRefresh }: { run: RunDetailResponse; onRefresh: () => void }) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [emailResults, setEmailResults] = useState<FinalistResult[]>([]);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spendPct = Math.min(100, (run.spendUsd / run.budgetCapUsd) * 100);
  const columns = run.rows[0] ? Object.keys(run.rows[0].headline) : [];
  const cacheHits = run.toolCalls.filter((c) => c.cacheHit).length;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <section className="card">
      <header className="runhead">
        <div>
          <h2>{run.label}</h2>
          <p className="src">
            {run.kind === 'vc' ? 'VC research' : 'Hiring'} · {run.pilot ? 'pilot' : 'full'} run ·
            started {run.createdAt}
          </p>
        </div>
        <div className="spend">
          <span className={`badge ${run.status === 'failed' ? 'danger' : 'ok'}`}>{run.status}</span>
          <div className="meter">
            <div className="fill" style={{ width: `${spendPct}%` }} />
          </div>
          <span className="src">
            {usd(run.spendUsd)} of {usd(run.budgetCapUsd)} cap · {usd(run.remainingUsd)} left ·{' '}
            {run.toolCalls.length} calls, {cacheHits} cached (free)
          </span>
          {run.status === 'running' ? (
            <button type="button" onClick={() => void api.cancelRun(run.id).then(onRefresh)}>
              Cancel
            </button>
          ) : null}
        </div>
      </header>

      {run.error ? <p className="dq">{run.error}</p> : null}

      <ol className="steps">
        {run.steps.map((s) => (
          <li key={s.seq} className={s.status}>
            <span className="badge">{s.status}</span> {s.name}
            {s.detail ? <span className="src"> — {s.detail}</span> : null}
          </li>
        ))}
      </ol>

      <table className="results">
        <thead>
          <tr>
            <th />
            <th>#</th>
            <th>Score</th>
            <th>Name</th>
            {columns.map((c) => (
              <th key={c}>{c.replace(/([A-Z])/g, ' $1')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {run.rows.map((row) => (
            <Fragment key={row.id}>
              <tr
                className={row.disqualified ? 'dqrow' : ''}
                onClick={() => setOpenRow(openRow === row.id ? null : row.id)}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    disabled={Boolean(row.disqualified)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggle(row.id)}
                  />
                </td>
                <td>{row.rank ?? '—'}</td>
                <td className="score">{row.score ?? '—'}</td>
                <td>
                  {row.name}
                  {row.disqualified ? <span className="badge danger">disqualified</span> : null}
                </td>
                {headlineCells(row).map((v, i) => (
                  <td key={`${row.id}-${i}`}>{v === 'unknown' ? <span className="unknown">unknown</span> : v}</td>
                ))}
              </tr>
              {openRow === row.id ? (
                <tr>
                  <td colSpan={4 + columns.length}>
                    <RowDetail row={row} onSaved={onRefresh} />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>

      <div className="row actions">
        <button
          type="button"
          disabled={selected.size === 0 || resolving}
          onClick={() => {
            setResolving(true);
            setError(null);
            api
              .resolveFinalists(run.id, [...selected])
              .then((r) => {
                setEmailResults(r.results);
                onRefresh();
              })
              .catch((e: Error) => setError(e.message))
              .finally(() => setResolving(false));
          }}
        >
          {resolving
            ? 'Resolving…'
            : `Resolve verified emails for ${selected.size} finalist${selected.size === 1 ? '' : 's'}`}
        </button>
        <span className="src">
          Billed per lookup, so emails are resolved only for rows you pick — never the whole pool.
        </span>
      </div>
      {error ? <p className="dq">{error}</p> : null}
      {emailResults.length > 0 ? (
        <ul className="history">
          {emailResults.map((r) => (
            <li key={r.rowId}>
              {run.rows.find((x) => x.id === r.rowId)?.name ?? r.rowId}:{' '}
              {r.email ? <strong>{r.email}</strong> : <span className="unknown">not found</span>}{' '}
              <span className="badge">{r.verification}</span>
              {r.error ? <span className="src"> {r.error}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
