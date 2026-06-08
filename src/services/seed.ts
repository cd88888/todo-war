import type { GameEvent, GameState, PlayerId, Recurrence, Task } from '../types'
import { PLAYERS } from '../types'
import { uid } from './sync'

// Best-effort transcription of the whiteboard photo (IMG_4576) plus the tasks Cam &
// Arthur dictated. Everything starts open (0–0). Points use the 1–10 rubric and are
// fully editable in-app.

interface SeedRow {
  title: string
  category: string
  points: number // 1–10
  done: boolean
  /** how many days ago it was completed (only for done items) */
  daysAgo?: number
  subtasks?: string[]
  notes?: string
  recurrence?: Recurrence
  isGoal?: boolean
  targetMonth?: string
}

const CAM: SeedRow[] = [
  // ── Whiteboard originals ──────────────────────────────────────────────────
  { title: 'NNHC Recission', category: 'Legal', points: 5, done: false },
  { title: 'VA Medicaid attorney', category: 'Legal', points: 3, done: false },
  { title: 'Locora MSA', category: 'Deals', points: 5, done: false },
  { title: 'Lawyer / lawsuit', category: 'Legal', points: 5, done: false },
  { title: 'Close Illinois', category: 'Deals', points: 10, done: false },
  {
    title: 'VAS',
    category: 'AI / Automation',
    points: 5,
    done: false,
    subtasks: ['IE', 'AI Conformer'],
  },
  { title: 'Business bank account', category: 'Ops', points: 3, done: false },
  { title: 'Clio / Jiri', category: 'Ops', points: 3, done: false },
  { title: 'Acquire van', category: 'Ops', points: 3, done: false },
  { title: 'Cap raise plan', category: 'Fundraising', points: 10, done: false },
  { title: 'AI auto with Claude', category: 'AI / Automation', points: 5, done: false },
  { title: 'Automatic / async onboarding', category: 'AI / Automation', points: 5, done: false },
  { title: 'More AI automations', category: 'AI / Automation', points: 3, done: false },
  { title: 'Add old to-dos + close-out clause', category: 'Ops', points: 1, done: false },
  // ── New tasks (week of Jun 8) ─────────────────────────────────────────────
  // 🔥 TOP PRIORITY
  { title: 'Send lender all requested documents', category: 'Fundraising', points: 10, done: false, notes: 'Top priority this week — send everything the SBA lender has asked for' },
  { title: 'Figure out debt transfer → send PFS to SBA lender', category: 'Fundraising', points: 5, done: false },
  // Legal / Deals
  { title: 'Negotiate NJ deal', category: 'Deals', points: 10, done: false, notes: 'Due end of next week' },
  { title: 'Finalize MSA with directors + lawyer', category: 'Legal', points: 5, done: false },
  { title: 'Finalize purchase agreement with directors', category: 'Legal', points: 5, done: false },
  { title: 'Finalize lease agreement with directors', category: 'Legal', points: 5, done: false },
  // Ops / HR
  { title: 'Fix HR hole — hire ops person', category: 'Ops', points: 5, done: false },
  { title: 'Fill other key hires', category: 'Ops', points: 3, done: false },
  // Sales
  { title: 'Fix sales team follow-ups + SOPs', category: 'Sales', points: 5, done: false },
  { title: 'Create sales scripts', category: 'Sales', points: 3, done: false },
  { title: 'Train sales team', category: 'Sales', points: 3, done: false },
  { title: 'Keep sales pipeline growing', category: 'Sales', points: 3, done: false },
  { title: 'Send Richard the sales process', category: 'Sales', points: 1, done: false },
  // Growth / AI
  { title: 'Max out LinkedIn connections', category: 'Sales', points: 3, done: false },
  { title: 'Reach out to investors', category: 'Fundraising', points: 5, done: false },
  { title: 'Build Claude auto-outreach (1k/week → meetings)', category: 'AI / Automation', points: 10, done: false },
  // Personal
  { title: 'Pay physical therapy', category: 'General', points: 1, done: false },
  { title: 'Get new phone', category: 'General', points: 1, done: false, notes: 'By end of month' },
]

const ARTHUR: SeedRow[] = [
  { title: 'Email tenants — renew leases or list on market', category: 'Ops', points: 4, done: false, recurrence: 'weekly' },
  { title: 'Hire dry cleaning expert', category: 'Ops', points: 3, done: false },
  { title: 'Commitment letter completed', category: 'Deals', points: 5, done: false },
  { title: 'Purchase agreement signed', category: 'Deals', points: 10, done: false },
  { title: 'Lease agreement signed', category: 'Deals', points: 10, done: false },
  { title: '5 new LOIs (+2 MSAs signed)', category: 'Sales', points: 10, done: false },
  { title: 'Email campaign to sellers — blast all leads/emails', category: 'Sales', points: 6, done: false },
  { title: 'Re-work sales script', category: 'Sales', points: 3, done: false },
  { title: 'Transmsy pipeline', category: 'Sales', points: 3, done: false },
  { title: 'Jim call', category: 'Sales', points: 1, done: false },
  { title: 'Springfield', category: 'Deals', points: 5, done: false },
  { title: 'Pay PT', category: 'Ops', points: 1, done: false },
  { title: 'Deal pipeline', category: 'Sales', points: 5, done: false },
  { title: 'Kodiak Closing MSA', category: 'Deals', points: 10, done: false },
  { title: 'Edgar MSA', category: 'Deals', points: 5, done: false },
  { title: 'Salesforce', category: 'Ops', points: 3, done: false },
  { title: 'New Print', category: 'Ops', points: 1, done: false },
  { title: 'App Sales', category: 'Sales', points: 3, done: false },
  { title: 'Send Richard salesperson spreadsheet', category: 'Sales', points: 1, done: false },
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
      points: Math.max(1, Math.min(10, r.points)),
      order: i + 1,
      notes: r.notes,
      subtasks: (r.subtasks ?? []).map((t) => ({ id: uid(), title: t, done: false })),
      status: r.done ? 'done' : 'open',
      createdAt,
      completedAt,
      recurrence: r.recurrence && r.recurrence !== 'none' ? r.recurrence : undefined,
      isGoal: r.isGoal || undefined,
      targetMonth: r.targetMonth || undefined,
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
