import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GraveCard from '../components/GraveCard'
import { diagnose } from '../lib/founderOs'
import { loadStartups } from '../lib/storage'
import type { Status } from '../lib/types'

const FILTERS: { id: Status | 'all'; label: string }[] = [
  { id: 'all', label: 'All graves' },
  { id: 'buried', label: 'Buried' },
  { id: 'dormant', label: 'Dormant' },
  { id: 'reviving', label: 'Reviving' },
]

export default function Graveyard() {
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const startups = useMemo(() => loadStartups(), [])

  const visible = startups.filter((s) => filter === 'all' || s.status === filter)
  const revivable = startups.filter((s) => diagnose(s).revivalScore >= 50).length

  return (
    <>
      <section className="hero">
        <h1>
          Every hackathon leaves a graveyard.
          <br />
          This one has an exit.
        </h1>
        <p>
          Bury your dead startup or your unbuilt idea. Founder OS reads the grave, acts as the CEO
          you never hired, names exactly what is missing, and pulls the specific person out of the
          Accelerate Me database who fixes it.
        </p>
        <div className="stats">
          <div className="stat">
            <b>{startups.length}</b>
            <span>graves</span>
          </div>
          <div className="stat">
            <b>{revivable}</b>
            <span>revivable today</span>
          </div>
          <div className="stat">
            <b>12 yrs</b>
            <span>of AMe talent</span>
          </div>
        </div>
        <p style={{ marginTop: 22 }}>
          <Link to="/bury" className="btn primary">
            Bury an idea → get a revival plan
          </Link>
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

      {visible.length === 0 ? (
        <p className="empty">No graves here yet. That is a good thing.</p>
      ) : (
        <div className="grid">
          {visible.map((startup) => (
            <GraveCard key={startup.id} startup={startup} />
          ))}
        </div>
      )}
    </>
  )
}
