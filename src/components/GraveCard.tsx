import { Link } from 'react-router-dom'
import { diagnose } from '../lib/founderOs'
import type { Startup } from '../lib/types'

const STATUS_LABEL: Record<Startup['status'], string> = {
  buried: 'Buried',
  dormant: 'Dormant',
  reviving: 'Reviving',
}

export default function GraveCard({ startup }: { startup: Startup }) {
  const { revivalScore } = diagnose(startup)

  return (
    <Link to={`/grave/${startup.id}`} className="grave">
      <h3>{startup.name}</h3>
      <p className="tagline">{startup.tagline}</p>
      <p className="epitaph">“{startup.epitaph}”</p>
      <div className="score">
        <b>{revivalScore}</b>
        <span>/100 revival score</span>
      </div>
      <div className="bar">
        <i style={{ width: `${revivalScore}%` }} />
      </div>
      <div className="meta" style={{ marginTop: 14 }}>
        <span className={`tag ${startup.status}`}>{STATUS_LABEL[startup.status]}</span>
        <span>{startup.sector}</span>
        <span>·</span>
        <span>{startup.stage}</span>
        <span>·</span>
        <span>died {startup.diedAt}</span>
      </div>
    </Link>
  )
}
