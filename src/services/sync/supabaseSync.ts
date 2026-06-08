import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { GameEvent, GameState, PlayerId, Task } from '../../types'
import { advanceDate, makeSubtasks, uid, type NewTaskInput, type SyncProvider } from './index'

// ── Supabase adapter (activated on deploy when env vars are set) ───────────────
//
// Storage model: ONE row in table `todo_war_game` holding the whole game as JSON.
// This mirrors the local adapter's whole-state model exactly, so behaviour is
// identical — the only difference is the transport (Postgres + Realtime instead
// of localStorage + BroadcastChannel), giving true cross-device real-time.
//
// Required one-time SQL (run in Supabase SQL editor):
//   create table todo_war_game (
//     id text primary key default 'singleton',
//     tasks jsonb not null default '[]',
//     events jsonb not null default '[]',
//     updated_at timestamptz not null default now()
//   );
//   insert into todo_war_game (id) values ('singleton') on conflict do nothing;
//   alter table todo_war_game enable row level security;
//   create policy "anon all" on todo_war_game for all using (true) with check (true);
//   -- enable Realtime for this table in the dashboard (Database → Replication).
//
const ROW_ID = 'singleton'
const TABLE = 'todo_war_game'
const MAX_EVENTS = 400

function trim(events: GameEvent[]): GameEvent[] {
  return events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events
}

export function createSupabaseSync(url: string, key: string): SyncProvider {
  const client: SupabaseClient = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 20 } },
  })

  let state: GameState = { tasks: [], events: [] }
  const listeners = new Set<(s: GameState) => void>()

  function emit() {
    for (const cb of listeners) cb(state)
  }

  async function flush() {
    // Optimistic local write-through. Last-write-wins on the singleton row.
    emit()
    try {
      await client
        .from(TABLE)
        .upsert({ id: ROW_ID, tasks: state.tasks, events: state.events, updated_at: new Date().toISOString() })
    } catch {
      /* offline — local state stands; next mutation retries */
    }
  }

  // Initial load + realtime subscription.
  ;(async () => {
    try {
      const { data } = await client.from(TABLE).select('tasks, events').eq('id', ROW_ID).single()
      if (data) {
        state = { tasks: (data.tasks as Task[]) ?? [], events: (data.events as GameEvent[]) ?? [] }
        emit()
      }
    } catch {
      /* table not provisioned yet */
    }
    client
      .channel('todo_war_game_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
        const row = payload.new as { tasks?: Task[]; events?: GameEvent[] } | null
        if (row) {
          state = { tasks: row.tasks ?? [], events: row.events ?? [] }
          emit()
        }
      })
      .subscribe()
  })()

  const findTask = (id: string) => state.tasks.find((t) => t.id === id)
  function replaceTask(id: string, next: Task) {
    state = { ...state, tasks: state.tasks.map((t) => (t.id === id ? next : t)) }
  }
  function pushEvent(ev: GameEvent) {
    state = { ...state, events: trim([...state.events, ev]) }
  }
  function nextOrder(owner: PlayerId): number {
    const orders = state.tasks.filter((t) => t.owner === owner).map((t) => t.order ?? 0)
    return (orders.length ? Math.max(...orders) : 0) + 1
  }
  function buildTask(input: NewTaskInput, order: number): Task {
    return {
      id: uid(),
      owner: input.owner,
      title: input.title.trim(),
      category: input.category.trim() || 'General',
      points: Math.max(1, Math.min(10, Math.round(input.points))),
      order: input.order ?? order,
      dueDate: input.dueDate || undefined,
      notes: input.notes?.trim() || undefined,
      subtasks: makeSubtasks(input.subtasks),
      status: 'open',
      createdAt: Date.now(),
      isGoal: input.isGoal || undefined,
      targetMonth: input.targetMonth || undefined,
      parentId: input.parentId || undefined,
      recurrence: input.recurrence && input.recurrence !== 'none' ? input.recurrence : undefined,
      seeded: input.seeded,
    }
  }

  return {
    getState: () => state,

    subscribe(cb) {
      listeners.add(cb)
      cb(state)
      return () => listeners.delete(cb)
    },

    addTask(input: NewTaskInput): Task {
      const task = buildTask(input, nextOrder(input.owner))
      state = { ...state, tasks: [...state.tasks, task] }
      pushEvent({
        id: uid(),
        type: 'created',
        playerId: task.owner,
        taskId: task.id,
        taskTitle: task.title,
        points: task.points,
        message: `added "${task.title}" (${task.points} pts)`,
        ts: task.createdAt,
      })
      void flush()
      return task
    },

    bulkAddTasks(inputs: NewTaskInput[]): Task[] {
      const created: Task[] = []
      const baseOrder: Record<PlayerId, number> = { cam: nextOrder('cam'), arthur: nextOrder('arthur') }
      for (const input of inputs) {
        const task = buildTask(input, baseOrder[input.owner]++)
        created.push(task)
        state = { ...state, tasks: [...state.tasks, task] }
        pushEvent({
          id: uid(),
          type: 'created',
          playerId: task.owner,
          taskId: task.id,
          taskTitle: task.title,
          points: task.points,
          message: `added "${task.title}" (${task.points} pts)`,
          ts: task.createdAt,
        })
      }
      void flush()
      return created
    },

    reorderTasks(owner, orderedIds) {
      const indexById = new Map(orderedIds.map((id, i) => [id, i + 1]))
      state = {
        ...state,
        tasks: state.tasks.map((t) =>
          t.owner === owner && indexById.has(t.id) ? { ...t, order: indexById.get(t.id)! } : t,
        ),
      }
      void flush()
    },

    updateTask(id, patch) {
      const t = findTask(id)
      if (!t) return
      replaceTask(id, { ...t, ...patch })
      void flush()
    },

    completeTask(id) {
      const t = findTask(id)
      if (!t || t.status === 'done') return
      const now = Date.now()
      replaceTask(id, { ...t, status: 'done', completedAt: now })
      pushEvent({
        id: uid(),
        type: 'completed',
        playerId: t.owner,
        taskId: t.id,
        taskTitle: t.title,
        points: t.points,
        message: `completed "${t.title}" +${t.points}`,
        ts: now,
      })
      if (t.recurrence && t.recurrence !== 'none') {
        const spawn: Task = {
          ...t,
          id: uid(),
          status: 'open',
          completedAt: undefined,
          createdAt: now,
          order: nextOrder(t.owner),
          dueDate: advanceDate(t.dueDate, t.recurrence),
          subtasks: t.subtasks.map((s) => ({ ...s, id: uid(), done: false })),
        }
        state = { ...state, tasks: [...state.tasks, spawn] }
      }
      void flush()
    },

    reopenTask(id) {
      const t = findTask(id)
      if (!t || t.status === 'open') return
      replaceTask(id, { ...t, status: 'open', completedAt: undefined })
      pushEvent({
        id: uid(),
        type: 'reopened',
        playerId: t.owner,
        taskId: t.id,
        taskTitle: t.title,
        points: t.points,
        message: `re-opened "${t.title}" (-${t.points})`,
        ts: Date.now(),
      })
      void flush()
    },

    deleteTask(id) {
      const t = findTask(id)
      if (!t) return
      state = { ...state, tasks: state.tasks.filter((x) => x.id !== id) }
      pushEvent({
        id: uid(),
        type: 'deleted',
        playerId: t.owner,
        taskId: t.id,
        taskTitle: t.title,
        message: `removed "${t.title}"`,
        ts: Date.now(),
      })
      void flush()
    },

    toggleSubtask(taskId, subtaskId) {
      const t = findTask(taskId)
      if (!t) return
      replaceTask(taskId, {
        ...t,
        subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)),
      })
      void flush()
    },

    appendEvent(event) {
      pushEvent(event)
      void flush()
    },

    replaceAll(next) {
      state = { tasks: [...next.tasks], events: trim([...next.events]) }
      void flush()
    },
  }
}
