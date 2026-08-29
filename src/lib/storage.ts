import { SEED_STARTUPS } from '../data/startups'
import type { Startup, Status } from './types'

const SUBMITTED_KEY = 'ame.graveyard.submitted.v1'
const STATUS_KEY = 'ame.graveyard.status.v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function loadStartups(): Startup[] {
  const submitted = read<Startup[]>(SUBMITTED_KEY, [])
  const overrides = read<Record<string, Status>>(STATUS_KEY, {})
  return [...submitted, ...SEED_STARTUPS].map((startup) => ({
    ...startup,
    status: overrides[startup.id] ?? startup.status,
  }))
}

export function saveStartup(startup: Startup): void {
  const submitted = read<Startup[]>(SUBMITTED_KEY, [])
  localStorage.setItem(SUBMITTED_KEY, JSON.stringify([startup, ...submitted]))
}

export function setStatus(id: string, status: Status): void {
  const overrides = read<Record<string, Status>>(STATUS_KEY, {})
  overrides[id] = status
  localStorage.setItem(STATUS_KEY, JSON.stringify(overrides))
}
