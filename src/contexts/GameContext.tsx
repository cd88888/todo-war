import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Board, GameEvent, GameState, Period, PlayerId, Task } from '../types'
import { PERIODS, PLAYERS } from '../types'
import { computeAllBoards } from '../services/scoring'
import { getSync, uid, type NewTaskInput } from '../services/sync'
import { lineFor } from '../services/trashTalk'

const IDENTITY_KEY = 'todoWar_identity_v1'

interface GameContextValue {
  state: GameState
  boards: Record<Period, Board>
  now: number
  currentPlayer: PlayerId | null
  setCurrentPlayer: (id: PlayerId | null) => void
  addTask: (input: NewTaskInput) => void
  bulkAddTasks: (inputs: NewTaskInput[]) => void
  updateTask: (id: string, patch: Parameters<ReturnType<typeof getSync>['updateTask']>[1]) => void
  completeTask: (id: string) => void
  reopenTask: (id: string) => void
  deleteTask: (id: string) => void
  toggleSubtask: (taskId: string, subtaskId: string) => void
  reorderTasks: (owner: PlayerId, orderedIds: string[]) => void
  replaceAll: (state: GameState) => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const sync = useMemo(() => getSync(), [])
  const [state, setState] = useState<GameState>(() => sync.getState())
  const [now, setNow] = useState(() => Date.now())
  const [currentPlayer, setCurrentPlayerState] = useState<PlayerId | null>(() => {
    const v = localStorage.getItem(IDENTITY_KEY)
    return v === 'cam' || v === 'arthur' ? v : null
  })

  // Keep React in sync with the provider (local mutations + other tabs / remote).
  useEffect(() => sync.subscribe(setState), [sync])

  // Roll period windows forward (so "Today" flips at midnight, etc.).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const boards = useMemo(() => computeAllBoards(state, now), [state, now])

  const setCurrentPlayer = useCallback((id: PlayerId | null) => {
    setCurrentPlayerState(id)
    if (id) localStorage.setItem(IDENTITY_KEY, id)
    else localStorage.removeItem(IDENTITY_KEY)
  }, [])

  const addTask = useCallback((input: NewTaskInput) => sync.addTask(input), [sync])
  const bulkAddTasks = useCallback((inputs: NewTaskInput[]) => sync.bulkAddTasks(inputs), [sync])

  // updateTask emits an audit event (edited / point_change) so the activity log
  // captures every change a player makes.
  const updateTask = useCallback<GameContextValue['updateTask']>(
    (id, patch) => {
      const before = sync.getState().tasks.find((t: Task) => t.id === id)
      sync.updateTask(id, patch)
      if (!before) return
      const after = sync.getState().tasks.find((t: Task) => t.id === id)
      if (!after) return
      if (patch.points != null && patch.points !== before.points) {
        sync.appendEvent({
          id: uid(),
          type: 'point_change',
          playerId: before.owner,
          taskId: id,
          taskTitle: after.title,
          points: after.points,
          message: `re-scored "${after.title}" ${before.points} → ${after.points}`,
          ts: Date.now(),
        })
      } else {
        const changedTitle = patch.title != null && patch.title !== before.title
        const changedFields = Object.keys(patch).filter((k) => k !== 'points')
        if (changedFields.length) {
          sync.appendEvent({
            id: uid(),
            type: 'edited',
            playerId: before.owner,
            taskId: id,
            taskTitle: after.title,
            message: changedTitle
              ? `renamed "${before.title}" → "${after.title}"`
              : `edited "${after.title}"`,
            ts: Date.now(),
          })
        }
      }
    },
    [sync],
  )
  const reopenTask = useCallback((id: string) => sync.reopenTask(id), [sync])
  const deleteTask = useCallback((id: string) => sync.deleteTask(id), [sync])
  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => sync.toggleSubtask(taskId, subtaskId),
    [sync],
  )
  const reorderTasks = useCallback(
    (owner: PlayerId, orderedIds: string[]) => sync.reorderTasks(owner, orderedIds),
    [sync],
  )
  const replaceAll = useCallback((s: GameState) => sync.replaceAll(s), [sync])

  // completeTask also computes DERIVED events (lead changes + milestones) by
  // comparing boards before/after. Only the acting tab does this → no duplicates.
  const completeTask = useCallback(
    (id: string) => {
      const before = sync.getState()
      const task = before.tasks.find((t) => t.id === id)
      if (!task || task.status === 'done') return
      const leadersBefore: Record<Period, PlayerId | null> = {} as Record<Period, PlayerId | null>
      for (const p of PERIODS) leadersBefore[p.key] = computeAllBoards(before, Date.now())[p.key].leader

      sync.completeTask(id)

      const after = sync.getState()
      const boardsAfter = computeAllBoards(after, Date.now())
      const derived: GameEvent[] = []

      // Lead changes: the completer overtook the opponent on a period.
      for (const p of PERIODS) {
        const leaderNow = boardsAfter[p.key].leader
        if (leaderNow === task.owner && leadersBefore[p.key] !== task.owner) {
          const label = PERIODS.find((x) => x.key === p.key)?.label ?? p.key
          derived.push({
            id: uid(),
            type: 'lead_change',
            playerId: task.owner,
            period: p.key,
            taskTitle: task.title,
            message: `${PLAYERS[task.owner].name} took the ${label} lead`,
            ts: Date.now(),
          })
        }
      }

      // Milestone: completing a Major+ task (8–10 pts).
      if (task.points >= 8) {
        const tier = task.points >= 10 ? 'EPIC' : 'MAJOR'
        derived.push({
          id: uid(),
          type: 'milestone',
          playerId: task.owner,
          taskId: task.id,
          taskTitle: task.title,
          points: task.points,
          message: `${PLAYERS[task.owner].name} crushed a ${tier}: "${task.title}" (+${task.points})`,
          ts: Date.now(),
        })
      }

      for (const ev of derived) {
        // Attach a trash-talk flavor line so notifications/feed can show it.
        ev.message = lineFor(ev) ?? ev.message
        sync.appendEvent(ev)
      }
    },
    [sync],
  )

  // Stable ref so we never miss the latest player inside async notifiers.
  const playerRef = useRef(currentPlayer)
  playerRef.current = currentPlayer

  const value: GameContextValue = {
    state,
    boards,
    now,
    currentPlayer,
    setCurrentPlayer,
    addTask,
    bulkAddTasks,
    updateTask,
    completeTask,
    reopenTask,
    deleteTask,
    toggleSubtask,
    reorderTasks,
    replaceAll,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
