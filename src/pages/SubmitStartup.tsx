import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveStartup } from '../lib/storage'
import type { CauseOfDeath, Role, Sector, Stage, Startup } from '../lib/types'

const SECTORS: Sector[] = [
  'ai',
  'fintech',
  'healthtech',
  'climate',
  'consumer',
  'edtech',
  'deeptech',
  'marketplace',
]

const STAGES: { id: Stage; label: string }[] = [
  { id: 'idea', label: 'Just an idea' },
  { id: 'prototype', label: 'Prototype / hackathon demo' },
  { id: 'launched', label: 'Launched, had users' },
  { id: 'revenue', label: 'Made revenue' },
]

const CAUSES: { id: CauseOfDeath; label: string }[] = [
  { id: 'never-started', label: 'Never actually started' },
  { id: 'no-technical-cofounder', label: 'Nobody could build it' },
  { id: 'no-users', label: 'Built it, nobody came' },
  { id: 'cofounder-split', label: 'Cofounders split' },
  { id: 'ran-out-of-money', label: 'Ran out of money' },
  { id: 'graduated', label: 'Everyone graduated / got a job' },
  { id: 'lost-momentum', label: 'Lost momentum' },
]

const ROLES: { id: Role; label: string }[] = [
  { id: 'ceo', label: 'Founder / CEO' },
  { id: 'cto', label: 'Technical lead' },
  { id: 'engineer', label: 'Engineer' },
  { id: 'designer', label: 'Designer' },
  { id: 'growth', label: 'Growth / marketing' },
  { id: 'sales', label: 'Sales' },
  { id: 'ops', label: 'Ops / finance' },
  { id: 'data', label: 'Data' },
  { id: 'domain', label: 'Industry insider' },
]

export default function SubmitStartup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [epitaph, setEpitaph] = useState('')
  const [sector, setSector] = useState<Sector>('ai')
  const [stage, setStage] = useState<Stage>('prototype')
  const [cause, setCause] = useState<CauseOfDeath>('lost-momentum')
  const [roles, setRoles] = useState<Role[]>(['ceo'])
  const [teamSize, setTeamSize] = useState(1)
  const [users, setUsers] = useState(0)
  const [revenue, setRevenue] = useState(0)
  const [runway, setRunway] = useState(0)
  const [submittedBy, setSubmittedBy] = useState('')

  function toggleRole(role: Role) {
    setRoles((current) =>
      current.includes(role) ? current.filter((entry) => entry !== role) : [...current, role],
    )
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const startup: Startup = {
      id: `s-${Date.now().toString(36)}`,
      name: name.trim(),
      tagline: tagline.trim(),
      sector,
      stage,
      status: 'buried',
      epitaph: epitaph.trim() || 'No epitaph. It just stopped.',
      causeOfDeath: cause,
      diedAt: new Date().toISOString().slice(0, 7),
      teamSize,
      rolesPresent: roles,
      users,
      monthlyRevenueGbp: revenue,
      runwayMonths: runway,
      hasRaised: false,
      submittedBy: submittedBy.trim() || 'Anonymous founder',
    }
    saveStartup(startup)
    navigate(`/grave/${startup.id}`)
  }

  return (
    <>
      <section className="hero">
        <h1>Bury it properly.</h1>
        <p>
          Six questions. Founder OS returns the diagnosis, the people who fix each gap, and the next
          three moves. Ideas that were never built count — those are the cheapest to revive.
        </p>
      </section>

      <form className="form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="name">Startup or idea name</label>
          <input
            id="name"
            value={name}
            required
            onChange={(event) => setName(event.target.value)}
            placeholder="SplitKit"
          />
        </div>

        <div className="field">
          <label htmlFor="tagline">One line: what it did</label>
          <input
            id="tagline"
            value={tagline}
            required
            onChange={(event) => setTagline(event.target.value)}
            placeholder="Rent and bills split for student houses."
          />
        </div>

        <div className="field">
          <label htmlFor="epitaph">Epitaph — why it stopped, in your words</label>
          <textarea
            id="epitaph"
            rows={2}
            value={epitaph}
            onChange={(event) => setEpitaph(event.target.value)}
            placeholder="900 users, then finals happened and nobody came back."
          />
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="sector">Sector</label>
            <select
              id="sector"
              value={sector}
              onChange={(event) => setSector(event.target.value as Sector)}
            >
              {SECTORS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="stage">How far it got</label>
            <select
              id="stage"
              value={stage}
              onChange={(event) => setStage(event.target.value as Stage)}
            >
              {STAGES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="cause">Cause of death</label>
          <select
            id="cause"
            value={cause}
            onChange={(event) => setCause(event.target.value as CauseOfDeath)}
          >
            {CAUSES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Who was actually on the team</label>
          <div className="roles">
            {ROLES.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`chip ${roles.includes(option.id) ? 'on' : ''}`}
                onClick={() => toggleRole(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="teamSize">Team size</label>
            <input
              id="teamSize"
              type="number"
              min={1}
              value={teamSize}
              onChange={(event) => setTeamSize(Number(event.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="users">Users it reached</label>
            <input
              id="users"
              type="number"
              min={0}
              value={users}
              onChange={(event) => setUsers(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="revenue">Monthly revenue (£)</label>
            <input
              id="revenue"
              type="number"
              min={0}
              value={revenue}
              onChange={(event) => setRevenue(Number(event.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="runway">Runway left (months)</label>
            <input
              id="runway"
              type="number"
              min={0}
              value={runway}
              onChange={(event) => setRunway(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="submittedBy">Your name or cohort</label>
          <input
            id="submittedBy"
            value={submittedBy}
            onChange={(event) => setSubmittedBy(event.target.value)}
            placeholder="AMe 2026 cohort"
          />
        </div>

        <div>
          <button type="submit" className="btn primary">
            Bury it and run Founder OS
          </button>
        </div>
      </form>
    </>
  )
}
