import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { diagnose } from '../lib/founderOs'
import { loadStartups, setStatus } from '../lib/storage'
import type { Gap, Startup } from '../lib/types'

const CAUSE_LABEL: Record<Startup['causeOfDeath'], string> = {
  'cofounder-split': 'Cofounder split',
  'no-technical-cofounder': 'No technical cofounder',
  'ran-out-of-money': 'Ran out of money',
  'no-users': 'No users',
  graduated: 'Everyone graduated',
  'lost-momentum': 'Lost momentum',
  'never-started': 'Never actually started',
}

function GapBlock({ gap }: { gap: Gap }) {
  return (
    <div className={`gap ${gap.severity}`}>
      <h3>
        {gap.title}
        <span className={`sev ${gap.severity}`}>{gap.severity}</span>
      </h3>
      <p>{gap.diagnosis}</p>
      <p className="rx">→ {gap.prescription}</p>

      {gap.talent.length > 0 && (
        <div className="people">
          {gap.talent.map((person) => (
            <div className="person" key={person.id}>
              <b>{person.name}</b>
              <span className="handle">
                {person.handle} · {person.availability} · {person.cohort}
              </span>
              <p>{person.headline}</p>
              <p>{person.proof}</p>
            </div>
          ))}
        </div>
      )}

      {gap.investors.length > 0 && (
        <div className="people">
          {gap.investors.map((investor) => (
            <div className="person" key={investor.id}>
              <b>{investor.name}</b>
              <span className="handle">{investor.cheque}</span>
              <p>{investor.thesis}</p>
              <p>Warm intro via {investor.warmIntroVia}.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StartupDetail() {
  const { id } = useParams()
  const startup = useMemo(() => loadStartups().find((entry) => entry.id === id), [id])
  const [status, setLocalStatus] = useState(startup?.status)

  if (!startup) {
    return (
      <p className="empty">
        This grave does not exist. <Link to="/">Back to the graveyard</Link>.
      </p>
    )
  }

  const { revivalScore, verdict, gaps, nextThreeMoves } = diagnose(startup)
  const graveId = startup.id

  function revive() {
    setStatus(graveId, 'reviving')
    setLocalStatus('reviving')
  }

  return (
    <>
      <div className="detail-head">
        <div>
          <div className="meta" style={{ marginBottom: 10 }}>
            <Link to="/">← Graveyard</Link>
            <span className={`tag ${status}`}>{status}</span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 34, letterSpacing: '-0.03em' }}>
            {startup.name}
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)' }}>{startup.tagline}</p>
          <p style={{ fontStyle: 'italic', marginTop: 14 }}>“{startup.epitaph}”</p>
          <div className="meta">
            <span className="tag">{CAUSE_LABEL[startup.causeOfDeath]}</span>
            <span>{startup.sector}</span>
            <span>·</span>
            <span>{startup.stage}</span>
            <span>·</span>
            <span>team of {startup.teamSize}</span>
            <span>·</span>
            <span>{startup.users.toLocaleString()} users</span>
            <span>·</span>
            <span>£{startup.monthlyRevenueGbp}/mo</span>
            {startup.hackathon && (
              <>
                <span>·</span>
                <span>{startup.hackathon}</span>
              </>
            )}
          </div>
        </div>
        <div className="panel" style={{ minWidth: 230, marginBottom: 0 }}>
          <div className="score">
            <b>{revivalScore}</b>
            <span>/100</span>
          </div>
          <div className="bar">
            <i style={{ width: `${revivalScore}%` }} />
          </div>
          <p className="sub" style={{ marginTop: 12, marginBottom: 16 }}>
            {verdict}
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={revive}
            disabled={status === 'reviving'}
          >
            {status === 'reviving' ? 'Revival in progress' : 'Start the revival'}
          </button>
        </div>
      </div>

      <section className="panel">
        <h2>Founder OS diagnosis</h2>
        <p className="sub">
          What a full-time CEO would have told this team. {gaps.length} gap
          {gaps.length === 1 ? '' : 's'} found, ordered by what kills you first.
        </p>
        {gaps.length === 0 ? (
          <p>No structural gaps. This one is not dead — it is just unattended. Go and ship.</p>
        ) : (
          gaps.map((gap) => <GapBlock key={gap.id} gap={gap} />)
        )}
      </section>

      <section className="panel">
        <h2>Next three moves</h2>
        <p className="sub">Nothing else matters until these are done.</p>
        <ol className="moves">
          {nextThreeMoves.map((move) => (
            <li key={move}>{move}</li>
          ))}
        </ol>
      </section>
    </>
  )
}
