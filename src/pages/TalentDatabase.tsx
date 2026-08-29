import { useMemo, useState } from 'react'
import GraveCard from '../components/GraveCard'
import { TALENT } from '../data/talent'
import { TEAM } from '../data/team'
import { loadStartups } from '../lib/storage'
import type { Availability } from '../lib/types'

type TabId = 'everyone' | 'active' | 'team' | 'contract' | 'intern'

const TABS: { id: TabId; label: string }[] = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'active', label: 'Active startups' },
  { id: 'team', label: 'Team Accelerate ME' },
  { id: 'contract', label: 'Contract' },
  { id: 'intern', label: 'Interns' },
]

const BLURB: Record<TabId, string> = {
  everyone:
    'Every startup and idea in the graveyard, alive or buried. Open one to see what killed it and what it needs.',
  active: 'Startups still moving — dormant or already reviving. These are the ones you can join now.',
  team: 'The people running Accelerate ME. Bring them the gap you cannot close yourself.',
  contract: 'Available for paid project work — the fastest way to unblock a startup without equity.',
  intern: 'Students who want their first real build. Cheap, fast, hungry.',
}

export default function TalentDatabase() {
  const [tab, setTab] = useState<TabId>('everyone')
  const [query, setQuery] = useState('')
  const startups = useMemo(() => loadStartups(), [])

  const needle = query.trim().toLowerCase()
  const showsStartups = tab === 'everyone' || tab === 'active'

  const visibleStartups = startups
    .filter((startup) => tab !== 'active' || startup.status !== 'buried')
    .filter((startup) => {
      if (!needle) return true
      return [startup.name, startup.tagline, startup.sector, startup.stage]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })

  const visibleTeam = TEAM.filter((member) => {
    if (!needle) return true
    return [member.name, member.title, member.headline, ...member.helpWith]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  })

  const visibleTalent = TALENT.filter((person) => {
    if (person.availability !== (tab as Availability)) return false
    if (!needle) return true
    return [person.name, person.headline, ...person.skills, ...person.sectors]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  })

  return (
    <>
      <section className="hero">
        <h1>The reason this works.</h1>
        <p>
          Every startup in the graveyard, and the Accelerate ME people who can revive one — twelve
          years of cohorts, alumni and mentors. Founder OS never gives generic advice: every gap it
          finds resolves to something in here.
        </p>
      </section>

      <div className="filters">
        {TABS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`chip ${tab === option.id ? 'on' : ''}`}
            onClick={() => setTab(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="sub" style={{ marginBottom: 16 }}>
        {BLURB[tab]}
      </p>

      <div className="field" style={{ maxWidth: 360, marginBottom: 20 }}>
        <label htmlFor="directory-search">
          {showsStartups ? 'Search startups or sectors' : 'Search skills or sectors'}
        </label>
        <input
          id="directory-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={showsStartups ? 'healthtech, prototype…' : 'pytorch, nhs, outbound…'}
        />
      </div>

      {showsStartups &&
        (visibleStartups.length === 0 ? (
          <p className="empty">Nothing matches that yet.</p>
        ) : (
          <div className="grid">
            {visibleStartups.map((startup) => (
              <GraveCard key={startup.id} startup={startup} />
            ))}
          </div>
        ))}

      {tab === 'team' &&
        (visibleTeam.length === 0 ? (
          <p className="empty">Nobody matches that yet.</p>
        ) : (
          <div className="grid">
            {visibleTeam.map((member) => (
              <article className="grave" key={member.id}>
                <h3>{member.name}</h3>
                <p className="tagline">{member.title}</p>
                <p className="epitaph">{member.focus}</p>
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
        ))}

      {(tab === 'contract' || tab === 'intern') &&
        (visibleTalent.length === 0 ? (
          <p className="empty">Nobody matches that yet.</p>
        ) : (
          <div className="grid">
            {visibleTalent.map((person) => (
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
        ))}
    </>
  )
}
