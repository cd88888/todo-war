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
import type { Board, GameEvent, GameState, Period, PlayerId } from '../types'
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
  updateTask: (id: string, patch: Parameters<ReturnType<typeof getSync>['updateTask']>[1]) => void
  completeTask: (id: string) => void
  reopenTask: (id: string) => void
  deleteTask: (id: string) => void
  toggleSubtask: (taskId: string, subtaskId: string) => void
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
  const updateTask = useCallback<GameContextValue['updateTask']>(
    (id, patch) => sync.updateTask(id, patch),
    [sync],
  )
  const reopenTask = useCallback((id: string) => sync.reopenTask(id), [sync])
  const deleteTask = useCallback((id: string) => sync.deleteTask(id), [sync])
  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => sync.toggleSubtask(taskId, subtaskId),
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

      // Milestone: completing an Epic (10-pt) task.
      if (task.points >= 10) {
        derived.push({
          id: uid(),
          type: 'milestone',
          playerId: task.owner,
          taskId: task.id,
          taskTitle: task.title,
          points: task.points,
          message: `${PLAYERS[task.owner].name} crushed an EPIC: "${task.title}" (+10)`,
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
    updateTask,
    completeTask,
    reopenTask,
    deleteTask,
    toggleSubtask,
    replaceAll,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
