// ── Core domain models for TODO WAR ───────────────────────────────────────────

export type PlayerId = 'cam' | 'arthur'

export interface Player {
  id: PlayerId
  name: string
  /** Neon accent hex (Cam = cyan, Arthur = magenta). */
  color: string
  emoji: string
}

/** Self-assigned difficulty → banked points on completion. Integer 1–10. */
export type PointsTier = number

export interface TierInfo {
  value: number
  label: string
  blurb: string
}

/** Shared rubric so Cam & Arthur score consistently — no cheating. */
export const POINTS_RUBRIC: TierInfo[] = [
  { value: 1, label: 'Trivial', blurb: '2-min admin' },
  { value: 2, label: 'Quick', blurb: 'Under 15 min' },
  { value: 3, label: 'Small', blurb: '~30 min' },
  { value: 4, label: 'Moderate', blurb: '~1 hour' },
  { value: 5, label: 'Solid', blurb: 'Half-day / real deliverable' },
  { value: 6, label: 'Hard', blurb: 'Full day or a key call' },
  { value: 7, label: 'Heavy', blurb: 'Multi-day, needs coordination' },
  { value: 8, label: 'Major', blurb: 'Closes something meaningful' },
  { value: 9, label: 'Huge', blurb: 'Big deal / large $ impact' },
  { value: 10, label: 'Epic', blurb: 'Company-moving' },
]

/** Back-compat alias — some code still imports TIERS. */
export const TIERS = POINTS_RUBRIC

export function rubricFor(points: number): TierInfo {
  const clamped = Math.max(1, Math.min(10, Math.round(points)))
  return POINTS_RUBRIC[clamped - 1]
}

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export type TaskStatus = 'open' | 'done'

export interface Task {
  id: string
  owner: PlayerId
  title: string
  category: string
  points: number // 1–10
  /** Urgency rank within an owner's list (lower = more urgent). */
  order: number
  dueDate?: string // ISO date (yyyy-mm-dd)
  notes?: string
  subtasks: Subtask[]
  status: TaskStatus
  createdAt: number // epoch ms
  completedAt?: number // epoch ms
  /** Goal = a big scored task, gold-tinted, with a target month. */
  isGoal?: boolean
  targetMonth?: string // yyyy-mm
  /** Links a to-do under a parent goal. */
  parentId?: string
  recurrence?: Recurrence
  /** True when this came from the original whiteboard import. */
  seeded?: boolean
}

export type GameEventType =
  | 'created'
  | 'completed'
  | 'reopened'
  | 'deleted'
  | 'edited'
  | 'point_change'
  | 'lead_change'
  | 'milestone'

export interface GameEvent {
  id: string
  type: GameEventType
  playerId: PlayerId
  taskId?: string
  taskTitle?: string
  points?: number
  period?: Period
  message: string
  ts: number // epoch ms
}

export interface GameState {
  tasks: Task[]
  events: GameEvent[]
}

// ── Leaderboards ──────────────────────────────────────────────────────────────

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'all'

export interface PeriodInfo {
  key: Period
  label: string
}

export const PERIODS: PeriodInfo[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'all', label: 'All Time' },
]

export interface Board {
  period: Period
  cam: number
  arthur: number
  /** null = tie. */
  leader: PlayerId | null
  margin: number
  /** Completed-task counts, for secondary display. */
  camCount: number
  arthurCount: number
}

// ── Players (static config) ────────────────────────────────────────────────────

export const PLAYERS: Record<PlayerId, Player> = {
  cam: { id: 'cam', name: 'Cam', color: '#00E5FF', emoji: '🦾' },
  arthur: { id: 'arthur', name: 'Arthur', color: '#FF2BD6', emoji: '🔥' },
}

/** Gold accent for goals. */
export const GOAL_COLOR = '#FFC53D'

export const PLAYER_IDS: PlayerId[] = ['cam', 'arthur']

export function opponentOf(id: PlayerId): PlayerId {
  return id === 'cam' ? 'arthur' : 'cam'
}
