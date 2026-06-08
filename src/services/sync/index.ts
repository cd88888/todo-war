import type { GameEvent, GameState, PlayerId, PointsTier, Subtask, Task } from '../../types'
import { createLocalSync } from './localSync'
import { createSupabaseSync } from './supabaseSync'

// ── The single interface every adapter implements ─────────────────────────────
// GameContext only ever talks to this, so swapping localStorage ↔ Supabase needs
// zero UI changes.

export interface NewTaskInput {
  owner: PlayerId
  title: string
  category: string
  points: PointsTier
  dueDate?: string
  notes?: string
  subtasks?: string[]
  seeded?: boolean
}

export interface SyncProvider {
  /** Current snapshot (synchronous read). */
  getState(): GameState
  /** Subscribe to every state change (local mutation OR remote/other-tab update). */
  subscribe(cb: (state: GameState) => void): () => void

  addTask(input: NewTaskInput): Task
  updateTask(id: string, patch: Partial<Omit<Task, 'id' | 'owner'>>): void
  completeTask(id: string): void
  reopenTask(id: string): void
  deleteTask(id: string): void
  toggleSubtask(taskId: string, subtaskId: string): void

  /** Append a derived event (lead_change / milestone) computed by the caller. */
  appendEvent(event: GameEvent): void

  /** Replace all data (used by seed import / reset). */
  replaceAll(state: GameState): void
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'id-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36)
}

export function makeSubtasks(titles?: string[]): Subtask[] {
  return (titles ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .map((title) => ({ id: uid(), title, done: false }))
}

// ── Factory ───────────────────────────────────────────────────────────────────
// Uses Supabase when configured (deploy), otherwise the local real-time adapter.

let singleton: SyncProvider | null = null

export function getSync(): SyncProvider {
  if (singleton) return singleton
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  // Supabase client is only constructed when both env vars are present (deploy);
  // otherwise the local real-time adapter runs with zero backend.
  singleton = url && key ? createSupabaseSync(url, key) : createLocalSync()
  return singleton
}

export const IS_REMOTE = Boolean(
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) &&
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined),
)
