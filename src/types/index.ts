// ── Core domain models for TODO WAR ───────────────────────────────────────────

export type PlayerId = 'cam' | 'arthur'

export interface Player {
  id: PlayerId
  name: string
  /** Neon accent hex (Cam = cyan, Arthur = magenta). */
  color: string
  emoji: string
}

/** Fixed, self-assigned difficulty tiers → banked points on completion. */
export type PointsTier = 1 | 3 | 5 | 10

export interface TierInfo {
  value: PointsTier
  label: string
  blurb: string
}

export const TIERS: TierInfo[] = [
  { value: 1, label: 'Quick', blurb: 'A few minutes' },
  { value: 3, label: 'Medium', blurb: 'An hour-ish' },
  { value: 5, label: 'Hard', blurb: 'Real effort' },
  { value: 10, label: 'Epic', blurb: 'Move the needle' },
]

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
  points: PointsTier
  dueDate?: string // ISO date (yyyy-mm-dd)
  notes?: string
  subtasks: Subtask[]
  status: TaskStatus
  createdAt: number // epoch ms
  completedAt?: number // epoch ms
  /** True when this came from the original whiteboard import. */
  seeded?: boolean
}

export type GameEventType =
  | 'created'
  | 'completed'
  | 'reopened'
  | 'deleted'
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

export const PLAYER_IDS: PlayerId[] = ['cam', 'arthur']

export function opponentOf(id: PlayerId): PlayerId {
  return id === 'cam' ? 'arthur' : 'cam'
}
