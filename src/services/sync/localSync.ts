import type { GameEvent, GameState, PlayerId, Task } from '../../types'
import { advanceDate, makeSubtasks, uid, type NewTaskInput, type SyncProvider } from './index'

// Real-time, zero-backend adapter.
//  • Persists the whole game to localStorage (mirrors weekly-pulse's storage.ts get/set).
//  • Broadcasts every change over a BroadcastChannel so OTHER tabs on this machine
//    (e.g. the apartment monitor at ?view=dashboard + a phone tab) update instantly.
//  • Falls back to the 'storage' event for browsers without BroadcastChannel.

const STORAGE_KEY = 'todoWar_state_v1'
const CHANNEL = 'todo-war'
const MAX_EVENTS = 400

function load(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as GameState
  } catch {
    /* ignore corrupt state */
  }
  return { tasks: [], events: [] }
}

export function createLocalSync(): SyncProvider {
  let state: GameState = load()
  const listeners = new Set<(s: GameState) => void>()

  const channel: BroadcastChannel | null =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null

  function emit() {
    for (const cb of listeners) cb(state)
  }

  function persist(broadcast: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* quota / private mode — still works in-memory this session */
    }
    if (broadcast) channel?.postMessage({ type: 'state', state })
    emit()
  }

  function adopt(next: GameState) {
    state = next
    // do not re-broadcast (avoid loops); just persist locally + notify UI
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
    emit()
  }

  // Receive updates from other tabs.
  channel?.addEventListener('message', (e: MessageEvent) => {
    if (e.data?.type === 'state' && e.data.state) adopt(e.data.state as GameState)
  })
  // Fallback for cross-tab when BroadcastChannel is unavailable.
  if (!channel && typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          adopt(JSON.parse(e.newValue) as GameState)
        } catch {
          /* ignore */
        }
      }
    })
  }

  function trimEvents(events: GameEvent[]): GameEvent[] {
    return events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events
  }

  function pushEvent(ev: GameEvent) {
    state = { ...state, events: trimEvents([...state.events, ev]) }
  }

  function findTask(id: string): Task | undefined {
    return state.tasks.find((t) => t.id === id)
  }

  function replaceTask(id: string, next: Task) {
    state = { ...state, tasks: state.tasks.map((t) => (t.id === id ? next : t)) }
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
      persist(true)
      return task
    },

    bulkAddTasks(inputs: NewTaskInput[]): Task[] {
      const created: Task[] = []
      let baseOrder: Record<PlayerId, number> = { cam: 0, arthur: 0 }
      baseOrder = { cam: nextOrder('cam'), arthur: nextOrder('arthur') }
      for (const input of inputs) {
        const order = baseOrder[input.owner]++
        const task = buildTask(input, order)
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
      persist(true)
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
      persist(true)
    },

    updateTask(id, patch) {
      const t = findTask(id)
      if (!t) return
      replaceTask(id, { ...t, ...patch })
      persist(true)
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
      // Recurring tasks respawn the next open instance so they never disappear.
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
      persist(true)
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
      persist(true)
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
      persist(true)
    },

    toggleSubtask(taskId, subtaskId) {
      const t = findTask(taskId)
      if (!t) return
      replaceTask(taskId, {
        ...t,
        subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)),
      })
      persist(true)
    },

    appendEvent(event) {
      pushEvent(event)
      persist(true)
    },

    replaceAll(next) {
      state = { tasks: [...next.tasks], events: trimEvents([...next.events]) }
      persist(true)
    },
  }
}
