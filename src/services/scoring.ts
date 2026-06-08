import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  endOfDay,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
} from 'date-fns'
import type { Board, GameState, Period, PlayerId, Task } from '../types'
import { PERIODS } from '../types'

export interface Window {
  start: number
  end: number
}

/** [start, end) epoch-ms window for a period anchored at `now`. */
export function periodWindow(period: Period, now: number = Date.now()): Window {
  const d = new Date(now)
  switch (period) {
    case 'day':
      return { start: startOfDay(d).getTime(), end: endOfDay(d).getTime() }
    case 'week':
      // Monday-start weeks.
      return {
        start: startOfWeek(d, { weekStartsOn: 1 }).getTime(),
        end: endOfWeek(d, { weekStartsOn: 1 }).getTime(),
      }
    case 'month':
      return { start: startOfMonth(d).getTime(), end: endOfMonth(d).getTime() }
    case 'quarter':
      return { start: startOfQuarter(d).getTime(), end: endOfQuarter(d).getTime() }
    case 'all':
    default:
      return { start: 0, end: Number.MAX_SAFE_INTEGER }
  }
}

function inWindow(task: Task, w: Window): boolean {
  return (
    task.status === 'done' &&
    task.completedAt != null &&
    task.completedAt >= w.start &&
    task.completedAt <= w.end
  )
}

/** Compute one leaderboard for a period. */
export function computeBoard(state: GameState, period: Period, now: number = Date.now()): Board {
  const w = periodWindow(period, now)
  let cam = 0
  let arthur = 0
  let camCount = 0
  let arthurCount = 0
  for (const t of state.tasks) {
    if (!inWindow(t, w)) continue
    if (t.owner === 'cam') {
      cam += t.points
      camCount++
    } else {
      arthur += t.points
      arthurCount++
    }
  }
  const leader: PlayerId | null = cam === arthur ? null : cam > arthur ? 'cam' : 'arthur'
  return { period, cam, arthur, leader, margin: Math.abs(cam - arthur), camCount, arthurCount }
}

/** All five boards at once. */
export function computeAllBoards(state: GameState, now: number = Date.now()): Record<Period, Board> {
  const out = {} as Record<Period, Board>
  for (const p of PERIODS) out[p.key] = computeBoard(state, p.key, now)
  return out
}

export function pointsFor(state: GameState, player: PlayerId, period: Period, now?: number): number {
  const b = computeBoard(state, period, now)
  return player === 'cam' ? b.cam : b.arthur
}
