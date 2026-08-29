import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PERKS } from '../data/perks'
import { TEAM } from '../data/team'
import { diagnose } from '../lib/founderOs'
import { loadStartups } from '../lib/storage'
import type { Startup } from '../lib/types'

/** What to type into an external search when the AMe database is not enough. */
const SEARCH_TERMS: Record<string, string> = {
  technical: 'student software engineer cofounder',
  commercial: 'student sales growth cofounder',
  solo: 'startup cofounder student',
  domain: 'industry advisor',
  traction: 'growth marketing freelancer',
  capital: 'student startup grant funding',
  governance: 'startup operations advisor cap table',
  data: 'data analyst intern',
}

function searchLinks(gapId: string, startup: Startup) {
  const terms = `${SEARCH_TERMS[gapId] ?? 'startup cofounder'} ${startup.sector}`
  return [
    {
      label: 'Search LinkedIn',
      url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(terms)}`,
    },
    {
      label: 'Deepline research',
      url: `https://deepline.ai/?q=${encodeURIComponent(terms)}`,
    },
  ]
}

export default function StartupDashboard() {
  const { id } = useParams()
  const startup = useMemo(() => loadStartups().find((entry) => entry.id === id), [id])

  if (!startup) {
    return (
      <p className="empty">
        No dashboard for that startup. <Link to="/">Back to the graveyard</Link>.
      </p>
    )
  }

  const { revivalScore, verdict, gaps, nextThreeMoves } = diagnose(startup)

  return (
    <>
      <div className="detail-head">
        <div>
          <div className="meta" style={{ marginBottom: 10 }}>
            <Link to={`/grave/${startup.id}`}>← {startup.name}</Link>
            <span className={`tag ${startup.status}`}>{startup.status}</span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 34, letterSpacing: '-0.03em' }}>
            {startup.name} — after the hackathon
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            One page to work from on Monday: what to do, who to bring in, and what is still free to
            claim.
          </p>
        </div>
        <div className="panel" style={{ minWidth: 230, marginBottom: 0 }}>
          <div className="score">
            <b>{revivalScore}</b>
            <span>/100</span>
          </div>
          <div className="bar">
            <i style={{ width: `${revivalScore}%` }} />
          </div>
          <p className="sub" style={{ marginTop: 12, marginBottom: 0 }}>
            {verdict}
          </p>
        </div>
      </div>

      <section className="panel">
        <h2>Next 30 days</h2>
        <p className="sub">Straight from the diagnosis. Nothing else matters until these are done.</p>
        <ol className="moves">
          {nextThreeMoves.map((move) => (
            <li key={move}>{move}</li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <h2>Who you need, and where to find them</h2>
        <p className="sub">
          Accelerate Me first — a named person beats a job ad. If the database has nobody, the same
          gap becomes an external search.
        </p>
        {gaps.length === 0 ? (
          <p>No gaps to hire against. Go and ship.</p>
        ) : (
          gaps.map((gap) => (
            <div className={`gap ${gap.severity}`} key={gap.id}>
              <h3>
                {gap.title}
                <span className={`sev ${gap.severity}`}>{gap.severity}</span>
              </h3>
              <p className="rx">→ {gap.prescription}</p>
              {gap.talent.length > 0 ? (
                <div className="people">
                  {gap.talent.map((person) => (
                    <div className="person" key={person.id}>
                      <b>{person.name}</b>
                      <span className="handle">
                        {person.handle} · {person.availability} · {person.cohort}
                      </span>
                      <p>{person.headline}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Nobody in the AMe database matches this one yet.</p>
              )}
              <div className="meta" style={{ marginTop: 10 }}>
                {searchLinks(gap.id, startup).map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="panel">
        <h2>Talk to Accelerate Me</h2>
        <p className="sub">The team runs the programme, the intros and the cohort places.</p>
        <div className="people">
          {TEAM.map((member) => (
            <div className="person" key={member.id}>
              <b>{member.name}</b>
              <span className="handle">{member.title}</span>
              <p>Bring them: {member.helpWith.join(', ')}.</p>
              <a href={member.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Credits and tools still on the table</h2>
        <p className="sub">
          Hackathon perks expire quietly. Claim them while the code still works — they are runway you
          already won.
        </p>
        <div className="people">
          {PERKS.map((perk) => (
            <div className="person" key={perk.id}>
              <b>
                {perk.provider} — {perk.offer}
              </b>
              {perk.code && <span className="handle">Code: {perk.code}</span>}
              <p>{perk.howTo}</p>
              {perk.expires && <p>Expires: {perk.expires}.</p>}
              <a href={perk.url} target="_blank" rel="noreferrer">
                {perk.provider}
              </a>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
