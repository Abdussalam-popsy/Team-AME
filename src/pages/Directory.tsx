import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { directoryStartups } from '../lib/directory'

const PAGE = 60

const STATUS_LABEL = {
  active: 'Active',
  raising: 'Raising',
  dormant: 'Dormant',
  exited: 'Exited',
} as const

export default function Directory() {
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const startups = useMemo(() => directoryStartups(), [])

  const needle = query.trim().toLowerCase()
  const filtered = needle
    ? startups.filter((s) =>
        [s.name, s.tagline, s.sector, s.cohort, ...s.founders].join(' ').toLowerCase().includes(needle),
      )
    : startups
  const visible = filtered.slice(0, shown)

  return (
    <>
      <section className="hero">
        <h1>Every startup this community has ever made.</h1>
        <p>
          {startups.length.toLocaleString()} startups from twelve years of Accelerate ME cohorts and
          hackathons — active, raising, dormant and exited. Search it, open one, or ask Founder OS
          what happens to an idea before you build it.
        </p>
      </section>

      <div className="field" style={{ maxWidth: 420, marginBottom: 20 }}>
        <label htmlFor="dir-search">Search {filtered.length.toLocaleString()} startups</label>
        <input
          id="dir-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setShown(PAGE)
          }}
          placeholder="housr, proptech, cohort 9, a founder name…"
        />
      </div>

      {visible.length === 0 ? (
        <p className="empty">Nothing matches that yet.</p>
      ) : (
        <div className="grid">
          {visible.map((s) => {
            const card = (
              <>
                <h3>{s.name}</h3>
                <p className="tagline">{s.tagline}</p>
                <div className="meta">
                  <span className={`tag ${s.status === 'active' || s.status === 'raising' ? 'live' : 'inactive'}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                  <span>{s.cohort}</span>
                  <span>·</span>
                  <span>{s.sector}</span>
                </div>
                <div className="meta" style={{ marginTop: 10 }}>
                  {s.founders.map((f) => (
                    <span className="tag" key={f}>
                      {f}
                    </span>
                  ))}
                </div>
              </>
            )
            return s.id.startsWith('s-') ? (
              <Link to={`/grave/${s.id}`} className="grave" key={s.id}>
                {card}
              </Link>
            ) : (
              <article className="grave" key={s.id}>
                {card}
              </article>
            )
          })}
        </div>
      )}

      {filtered.length > shown && (
        <p style={{ textAlign: 'center', marginTop: 24 }}>
          <button type="button" className="btn" onClick={() => setShown(shown + PAGE)}>
            Show more ({(filtered.length - shown).toLocaleString()} left)
          </button>
        </p>
      )}
    </>
  )
}
