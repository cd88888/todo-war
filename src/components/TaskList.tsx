import { useState } from 'react'
import { ChevronDown, Target, Swords } from 'lucide-react'
import clsx from 'clsx'
import type { PlayerId, Task } from '../types'
import { GOAL_COLOR } from '../types'
import { useGame } from '../contexts/GameContext'
import TaskCard from './TaskCard'
import GoalCard from './GoalCard'

interface Props {
  tasks: Task[]
  owner: PlayerId
  editable: boolean
}

const byOrder = (a: Task, b: Task) => (a.order ?? 0) - (b.order ?? 0) || a.createdAt - b.createdAt

export default function TaskList({ tasks, owner, editable }: Props) {
  const { reorderTasks } = useGame()
  const [showDone, setShowDone] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const goalIds = new Set(tasks.filter((t) => t.isGoal).map((t) => t.id))
  const goals = tasks.filter((t) => t.isGoal).sort(byOrder)
  const childrenOf = (goalId: string) =>
    tasks.filter((t) => t.parentId === goalId).sort(byOrder)

  // Loose tasks = not a goal, not a (valid) child of a goal.
  const loose = tasks.filter((t) => !t.isGoal && !(t.parentId && goalIds.has(t.parentId)))
  const todos = loose.filter((t) => t.status === 'open').sort(byOrder)
  const done = loose.filter((t) => t.status === 'done').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

  // ── Reorder (urgency) over the open to-do list ──────────────────────────────
  function commitOrder(list: Task[]) {
    reorderTasks(owner, list.map((t) => t.id))
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...todos]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    commitOrder(next)
  }
  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return }
    const from = todos.findIndex((t) => t.id === dragId)
    const to = todos.findIndex((t) => t.id === targetId)
    if (from < 0 || to < 0) { setDragId(null); setOverId(null); return }
    const next = [...todos]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    commitOrder(next)
    setDragId(null)
    setOverId(null)
  }

  const empty = goals.length === 0 && todos.length === 0 && done.length === 0

  return (
    <div className="space-y-4">
      {empty && (
        <p className="text-center text-slate-500 text-sm py-8">No tasks yet. Add one and strike first.</p>
      )}

      {/* GOALS */}
      {goals.length > 0 && (
        <section>
          <h3 className="flex items-center gap-1.5 text-xs uppercase tracking-wider mb-2" style={{ color: GOAL_COLOR }}>
            <Target size={13} /> Goals
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} children={childrenOf(g.id)} editable={editable} />
            ))}
          </div>
        </section>
      )}

      {/* TO-DOS (ranked by urgency) */}
      {todos.length > 0 && (
        <section>
          <h3 className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-400 mb-2">
            <Swords size={13} /> To-dos <span className="text-slate-600 normal-case">· ranked by urgency</span>
          </h3>
          <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {todos.map((t, i) => (
              <TaskCard
                key={t.id}
                task={t}
                editable={editable}
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, 1)}
                isFirst={i === 0}
                isLast={i === todos.length - 1}
                dragProps={{
                  dragging: dragId === t.id,
                  over: overId === t.id,
                  onDragStart: () => setDragId(t.id),
                  onDragOver: (e) => { e.preventDefault(); setOverId(t.id) },
                  onDrop: () => handleDrop(t.id),
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* COMPLETED */}
      {done.length > 0 && (
        <section>
          <button
            onClick={() => setShowDone((s) => !s)}
            className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500 hover:text-slate-300 mb-2"
          >
            <ChevronDown size={14} className={clsx('transition', showDone && 'rotate-180')} />
            {done.length} completed
          </button>
          {showDone && (
            <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {done.map((t) => (
                <TaskCard key={t.id} task={t} editable={editable} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
