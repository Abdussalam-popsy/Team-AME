import { useState } from 'react'
import { TALENT } from '../data/talent'
import type { Availability } from '../lib/types'

const FILTERS: { id: Availability | 'all'; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'cofounder', label: 'Open to cofounding' },
  { id: 'advisor', label: 'Advisors' },
  { id: 'contract', label: 'Contract' },
  { id: 'intern', label: 'Interns' },
]

export default function TalentDatabase() {
  const [filter, setFilter] = useState<Availability | 'all'>('all')
  const [query, setQuery] = useState('')

  const visible = TALENT.filter((person) => {
    if (filter !== 'all' && person.availability !== filter) return false
    if (!query.trim()) return true
    const haystack = [person.name, person.headline, ...person.skills, ...person.sectors]
      .join(' ')
      .toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  return (
    <>
      <section className="hero">
        <h1>The reason this works.</h1>
        <p>
          Twelve years of Accelerate Me cohorts, alumni and mentors. Founder OS never gives generic
          advice — every gap it finds resolves to a named person in here.
        </p>
      </section>

      <div className="filters">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`chip ${filter === option.id ? 'on' : ''}`}
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="field" style={{ maxWidth: 360, marginBottom: 20 }}>
        <label htmlFor="talent-search">Search skills or sectors</label>
        <input
          id="talent-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="pytorch, nhs, outbound…"
        />
      </div>

      {visible.length === 0 ? (
        <p className="empty">Nobody matches that yet.</p>
      ) : (
        <div className="grid">
          {visible.map((person) => (
            <article className="grave" key={person.id}>
              <h3>{person.name}</h3>
              <p className="tagline">{person.headline}</p>
              <p className="epitaph">{person.proof}</p>
              <div className="meta">
                <span className="tag reviving">{person.availability}</span>
                <span>{person.university}</span>
              </div>
              <div className="meta" style={{ marginTop: 10 }}>
                {person.skills.map((skill) => (
                  <span className="tag" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
