import type { GameEvent, GameState, PlayerId, PointsTier, Task } from '../types'
import { PLAYERS } from '../types'
import { uid } from './sync'

// Best-effort transcription of the whiteboard photo (IMG_4576). Crossed-out items
// are seeded as done. Points/categories are sensible guesses — fully editable in-app.

interface SeedRow {
  title: string
  category: string
  points: PointsTier
  done: boolean
  /** how many days ago it was completed (only for done items) */
  daysAgo?: number
  subtasks?: string[]
  notes?: string
}

const CAM: SeedRow[] = [
  { title: 'NNHC Recission', category: 'Legal', points: 5, done: true, daysAgo: 9 },
  { title: 'VA Medicaid attorney', category: 'Legal', points: 3, done: true, daysAgo: 8 },
  { title: 'Locora MSA', category: 'Deals', points: 5, done: true, daysAgo: 3 },
  { title: 'Negotiate NJ Deal', category: 'Deals', points: 10, done: false },
  {
    title: 'VAS',
    category: 'AI / Automation',
    points: 5,
    done: false,
    subtasks: ['IE', 'AI Conformer'],
  },
  { title: 'Business bank account', category: 'Ops', points: 3, done: false },
  { title: 'Lawyer / lawsuit', category: 'Legal', points: 5, done: true, daysAgo: 6 },
  { title: 'Clio / Jiri', category: 'Ops', points: 3, done: false },
  { title: 'Close Illinois', category: 'Deals', points: 10, done: true, daysAgo: 2 },
  { title: 'Acquire van', category: 'Ops', points: 3, done: false },
  { title: 'Cap raise plan', category: 'Fundraising', points: 10, done: false },
  { title: 'AI auto with Claude', category: 'AI / Automation', points: 5, done: false },
  { title: 'Automatic / async onboarding', category: 'AI / Automation', points: 5, done: false },
  { title: 'More AI automations', category: 'AI / Automation', points: 3, done: false },
  { title: 'Add old to-dos + close-out clause', category: 'Ops', points: 1, done: false },
]

const ARTHUR: SeedRow[] = [
  { title: 'Hire dry cleaning expert', category: 'Ops', points: 3, done: false },
  { title: 'Commitment letter completed', category: 'Deals', points: 5, done: false },
  { title: 'Purchase agreement signed', category: 'Deals', points: 10, done: false },
  { title: 'Lease agreement signed', category: 'Deals', points: 10, done: false },
  { title: '5 new LOIs (+2 MSAs signed)', category: 'Sales', points: 10, done: false },
  { title: 'Re-work sales script', category: 'Sales', points: 3, done: true, daysAgo: 7 },
  { title: 'Transmsy pipeline', category: 'Sales', points: 3, done: true, daysAgo: 5 },
  { title: 'Jim call', category: 'Sales', points: 1, done: false },
  { title: 'Springfield', category: 'Deals', points: 5, done: true, daysAgo: 4 },
  { title: 'Pay PT', category: 'Ops', points: 1, done: false },
  { title: 'Deal pipeline', category: 'Sales', points: 5, done: true, daysAgo: 1 },
  { title: 'Kodiak Closing MSA', category: 'Deals', points: 10, done: false },
  { title: 'Edgar MSA', category: 'Deals', points: 5, done: false },
  { title: 'Salesforce', category: 'Ops', points: 3, done: true, daysAgo: 6 },
  { title: 'New Print', category: 'Ops', points: 1, done: false },
  { title: 'App Sales', category: 'Sales', points: 3, done: false },
  { title: 'Send Richard salesperson spreadsheet', category: 'Sales', points: 1, done: true, daysAgo: 2 },
]

const DAY = 86_400_000

function buildTasks(rows: SeedRow[], owner: PlayerId, now: number): { tasks: Task[]; events: GameEvent[] } {
  const tasks: Task[] = []
  const events: GameEvent[] = []
  rows.forEach((r, i) => {
    const createdAt = now - 14 * DAY + i * 1000
    const completedAt = r.done ? now - (r.daysAgo ?? 1) * DAY : undefined
    const task: Task = {
      id: uid(),
      owner,
      title: r.title,
      category: r.category,
      points: r.points,
      notes: r.notes,
      subtasks: (r.subtasks ?? []).map((t) => ({ id: uid(), title: t, done: false })),
      status: r.done ? 'done' : 'open',
      createdAt,
      completedAt,
      seeded: true,
    }
    tasks.push(task)
    if (r.done && completedAt) {
      events.push({
        id: uid(),
        type: 'completed',
        playerId: owner,
        taskId: task.id,
        taskTitle: task.title,
        points: task.points,
        message: `completed "${task.title}" +${task.points}`,
        ts: completedAt,
      })
    }
  })
  return { tasks, events }
}

export function buildSeedState(now: number = Date.now()): GameState {
  const cam = buildTasks(CAM, 'cam', now)
  const arthur = buildTasks(ARTHUR, 'arthur', now)
  const events = [...cam.events, ...arthur.events].sort((a, b) => a.ts - b.ts)
  return { tasks: [...cam.tasks, ...arthur.tasks], events }
}

export const SEED_PLAYER_NOTE = `Imported from your whiteboard — ${PLAYERS.cam.name} vs ${PLAYERS.arthur.name}. Fix anything I misread.`
