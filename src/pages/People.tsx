import { useMemo, useState } from 'react'
import { TEAM } from '../data/team'
import { people } from '../lib/directory'

type TabId = 'cohort' | 'cofounder' | 'team'

const TABS: { id: TabId; label: string }[] = [
  { id: 'cohort', label: 'In our cohort' },
  { id: 'cofounder', label: 'Potential co-founders' },
  { id: 'team', label: 'AME team' },
]

const PAGE = 60

export default function People() {
  const [tab, setTab] = useState<TabId>('cohort')
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const everyone = useMemo(() => people(), [])

  const needle = query.trim().toLowerCase()
  const filtered = everyone
    .filter((p) => p.group === tab)
    .filter((p) => !needle || [p.name, p.headline, p.detail].join(' ').toLowerCase().includes(needle))
  const visible = filtered.slice(0, shown)

  return (
    <>
      <section className="hero">
        <h1>People.</h1>
        <p>
          {everyone.length.toLocaleString()} names from twelve years of Accelerate ME — founders,
          alumni, community and the team. The notable ones are at the top.
        </p>
      </section>

      <div className="filters">
        {TABS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`chip ${tab === option.id ? 'on' : ''}`}
            onClick={() => {
              setTab(option.id)
              setShown(PAGE)
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="field" style={{ maxWidth: 420, marginBottom: 20 }}>
        <label htmlFor="people-search">Search {filtered.length.toLocaleString()} people</label>
        <input
          id="people-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setShown(PAGE)
          }}
          placeholder="oliver, housr, open to co-founding…"
        />
      </div>

      {tab === 'team' ? (
        <div className="grid">
          {TEAM.map((member) => (
            <article className="grave" key={member.id}>
              <h3>{member.name}</h3>
              <p className="tagline">{member.title}</p>
              <p className="epitaph">{member.achievement}</p>
              <p className="sub">{member.focus}</p>
              <div className="meta">
                <span className="tag reviving">AME team</span>
                <a href={member.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </div>
              <div className="meta" style={{ marginTop: 10 }}>
                {member.helpWith.map((item) => (
                  <span className="tag" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="empty">Nobody matches that yet.</p>
      ) : (
        <>
          <div className="grid">
            {visible.map((person) => (
              <article className="grave" key={person.id}>
                <h3>{person.name}</h3>
                <p className="tagline">{person.headline}</p>
                <p className="epitaph">{person.detail}</p>
                <div className="meta">
                  {person.notable && <span className="tag reviving">Notable</span>}
                  {person.linkedin && (
                    <a href={person.linkedin} target="_blank" rel="noreferrer">
                      LinkedIn
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
          {filtered.length > shown && (
            <p style={{ textAlign: 'center', marginTop: 24 }}>
              <button type="button" className="btn" onClick={() => setShown(shown + PAGE)}>
                Show more ({(filtered.length - shown).toLocaleString()} left)
              </button>
            </p>
          )}
        </>
      )}
    </>
  )
}
