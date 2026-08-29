import { useState } from 'react';
import type {
  CandidateDetail,
  Evidence,
  PartnerDetail,
  ResultRow,
} from '../../shared/types.js';
import { api, money } from '../api.js';

const isPartner = (row: ResultRow): row is ResultRow & { detail: PartnerDetail } =>
  row.entityKind === 'partner';

function Value({ children }: { children: string | undefined }) {
  if (!children || children === 'unknown') return <span className="unknown">unknown</span>;
  return <span>{children}</span>;
}

function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  return (
    <ul className="evidence">
      {evidence.map((e) => (
        <li key={e.id}>
          <code>{e.id}</code> <span className="field">{e.field}</span> {e.claim}{' '}
          <span className="src">
            {e.sourceUrl ? (
              <a href={e.sourceUrl} target="_blank" rel="noreferrer">
                {e.sourceKind}
              </a>
            ) : (
              e.sourceKind
            )}
          </span>
          {e.snippet ? <blockquote>{e.snippet}</blockquote> : null}
        </li>
      ))}
    </ul>
  );
}

function PartnerFacts({ detail }: { detail: PartnerDetail }) {
  const rp = detail.roundProfile;
  return (
    <>
      <dl className="facts">
        <dt>Firm</dt>
        <dd>
          {detail.firm.website ? (
            <a href={`https://${detail.firm.website}`} target="_blank" rel="noreferrer">
              {detail.firm.name}
            </a>
          ) : (
            detail.firm.name
          )}
        </dd>
        <dt>Title</dt>
        <dd>
          <Value>{detail.partner.title}</Value>
        </dd>
        <dt>Stages</dt>
        <dd>
          {detail.stageFit.stages.length > 0 ? (
            detail.stageFit.stages.join(', ')
          ) : (
            <span className="unknown">unknown</span>
          )}
          {detail.stageFit.leadsRounds === true ? ' · leads rounds' : ''}
        </dd>
        <dt>Observed round size</dt>
        <dd>
          {rp.roundsCounted > 0 ? (
            <>
              median {money(rp.medianRoundUsd)}
              {rp.rangeUsd ? ` (${money(rp.rangeUsd[0])}–${money(rp.rangeUsd[1])})` : ''} across{' '}
              {rp.roundsCounted} rounds — round totals, not their check
            </>
          ) : (
            <span className="unknown">unknown</span>
          )}
        </dd>
        <dt>Thesis</dt>
        <dd>
          <Value>{detail.thesis.summary}</Value>
        </dd>
      </dl>
      <h4>Portfolio overlap</h4>
      {detail.portfolioOverlap.length === 0 ? (
        <p className="unknown">no overlap found in their recorded investments</p>
      ) : (
        <ul className="overlap">
          {detail.portfolioOverlap.map((o) => (
            <li key={o.company}>
              {o.url ? (
                <a href={o.url} target="_blank" rel="noreferrer">
                  {o.company}
                </a>
              ) : (
                o.company
              )}
              {o.conflict ? <span className="badge danger">conflict</span> : null} — {o.why}
              {o.date ? ` · ${o.date.slice(0, 7)}` : ''}
              {o.amountUsd ? ` · ${money(o.amountUsd)} round` : ''}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function CandidateFacts({ detail }: { detail: CandidateDetail }) {
  return (
    <>
      <dl className="facts">
        <dt>Current</dt>
        <dd>
          <Value>{detail.person.title}</Value> at <Value>{detail.person.company}</Value>
        </dd>
        <dt>Location</dt>
        <dd>
          <Value>{detail.person.location}</Value>
        </dd>
        <dt>Links</dt>
        <dd>
          {detail.person.links.length === 0 ? (
            <span className="unknown">none</span>
          ) : (
            detail.person.links.map((l) => (
              <a key={l} href={l} target="_blank" rel="noreferrer">
                {new URL(l).hostname.replace(/^www\./, '')}
              </a>
            ))
          )}
        </dd>
      </dl>
      <h4>Must-haves</h4>
      <ul className="musthaves">
        {detail.mustHaves.map((m) => (
          <li key={m.requirement}>
            <span
              className={`badge ${m.met === true ? 'ok' : m.met === 'partial' ? 'warn' : 'danger'}`}
            >
              {m.met === true ? 'met' : m.met === 'partial' ? 'partial' : 'not evidenced'}
            </span>
            {m.requirement} — {m.evidence}
          </li>
        ))}
      </ul>
      <h4>Work history</h4>
      <ul className="history">
        {detail.history.map((h, i) => (
          <li key={`${h.company}-${i}`}>
            <Value>{h.role}</Value> · <Value>{h.company}</Value>{' '}
            <span className="src">
              {h.start?.slice(0, 7) ?? '?'} → {h.end?.slice(0, 7) ?? 'present'}
            </span>
          </li>
        ))}
      </ul>
      {detail.signals.length > 0 ? (
        <>
          <h4>Public signals</h4>
          <ul className="history">
            {detail.signals.map((s, i) => (
              <li key={`${s.kind}-${i}`}>
                <span className="field">{s.kind}</span> {s.detail}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

export function RowDetail({ row, onSaved }: { row: ResultRow; onSaved: () => void }) {
  const [subject, setSubject] = useState(row.draftSubject ?? '');
  const [body, setBody] = useState(row.draftBody ?? '');
  const [saving, setSaving] = useState(false);

  const contact = row.detail.contact;

  return (
    <div className="detail">
      {row.disqualified ? (
        <p className="dq">
          <strong>Disqualified before scoring:</strong> {row.disqualified.rule} —{' '}
          {row.disqualified.detail}. No rubric score or outreach draft was generated, and no model
          call was made for this row.
        </p>
      ) : null}

      {row.flags.length > 0 ? (
        <p className="flags">
          {row.flags.map((f) => (
            <span key={f} className="badge warn">
              {f}
            </span>
          ))}
        </p>
      ) : null}

      {isPartner(row) ? (
        <PartnerFacts detail={row.detail} />
      ) : (
        <CandidateFacts detail={row.detail as CandidateDetail} />
      )}

      {row.rubric.length > 0 ? (
        <>
          <h4>Rubric</h4>
          <table className="rubric">
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Weight</th>
                <th>Score</th>
                <th>Reason</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {row.rubric.map((r) => (
                <tr key={r.criterion}>
                  <td>{r.criterion}</td>
                  <td>{Math.round(r.weight * 100)}%</td>
                  <td>{r.score}/5</td>
                  <td>{r.reason}</td>
                  <td>
                    {r.evidenceIds.length === 0 ? (
                      <span className="unknown">none cited</span>
                    ) : (
                      r.evidenceIds.map((id) => <code key={id}>{id}</code>)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {row.scoreReason ? <p className="reason">{row.scoreReason}</p> : null}
        </>
      ) : null}

      {row.draftBody !== null ? (
        <>
          <h4>Outreach draft</h4>
          <input
            className="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="row actions">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setSaving(true);
                api
                  .saveDraft(row.id, subject, body)
                  .then(onSaved)
                  .finally(() => setSaving(false));
              }}
            >
              Save edits
            </button>
            {row.draftEditedAt ? <span className="src">edited {row.draftEditedAt}</span> : null}
          </div>
        </>
      ) : null}

      {contact ? (
        <p className="contact">
          <strong>{contact.email}</strong> <span className="badge ok">{contact.verification}</span>
        </p>
      ) : null}

      <h4>Evidence ({row.evidence.length})</h4>
      <EvidenceList evidence={row.evidence} />
    </div>
  );
}
