import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Trash2, Target } from 'lucide-react'
import clsx from 'clsx'
import type { Task } from '../types'
import { GOAL_COLOR } from '../types'
import { useGame } from '../contexts/GameContext'
import { suggestPoints } from '../services/suggest'
import PointsPicker from './PointsPicker'

interface Props {
  goal: Task
  children: Task[]
  editable: boolean
}

function monthLabel(ym?: string): string | null {
  if (!ym) return null
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return null
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

export default function GoalCard({ goal, children, editable }: Props) {
  const { state, completeTask, reopenTask, deleteTask, updateTask, addTask } = useGame()
  const [open, setOpen] = useState(true)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draft, setDraft] = useState(goal.title)
  const [pickPoints, setPickPoints] = useState(false)
  const [newChild, setNewChild] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  const done = goal.status === 'done'
  const childDone = children.filter((c) => c.status === 'done').length
  const pct = children.length ? Math.round((childDone / children.length) * 100) : done ? 100 : 0
  const month = monthLabel(goal.targetMonth)

  useEffect(() => { if (editingTitle) titleRef.current?.focus() }, [editingTitle])

  function saveTitle() {
    const v = draft.trim()
    if (v && v !== goal.title) updateTask(goal.id, { title: v })
    else setDraft(goal.title)
    setEditingTitle(false)
  }

  function addChild() {
    const v = newChild.trim()
    if (!v) return
    const sug = suggestPoints(v, goal.category, state)
    addTask({ owner: goal.owner, title: v, category: goal.category, points: sug.points, parentId: goal.id })
    setNewChild('')
  }

  return (
    <div
      className="rounded-xl p-3 relative"
      style={{
        background: `linear-gradient(180deg, ${GOAL_COLOR}14, transparent)`,
        boxShadow: `inset 0 0 0 1px ${GOAL_COLOR}55`,
      }}
    >
      <div className="flex items-center gap-2">
        <Target size={15} style={{ color: GOAL_COLOR }} className="shrink-0" />

        {/* Complete toggle */}
        <button
          onClick={() => editable && (done ? reopenTask(goal.id) : completeTask(goal.id))}
          disabled={!editable}
          className="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center"
          style={done ? { background: GOAL_COLOR, borderColor: GOAL_COLOR } : { borderColor: GOAL_COLOR + '88' }}
        >
          {done && <Check size={12} strokeWidth={4} className="text-ink-900" />}
        </button>

        {editingTitle ? (
          <input
            ref={titleRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setDraft(goal.title); setEditingTitle(false) } }}
            className="flex-1 min-w-0 bg-ink-700 border border-white/20 rounded px-1.5 py-0.5 text-sm font-semibold outline-none"
          />
        ) : (
          <span
            onClick={() => editable && (setDraft(goal.title), setEditingTitle(true))}
            className={clsx('flex-1 font-display font-bold text-sm truncate', done && 'line-through opacity-60', editable && 'cursor-text')}
          >
            {goal.title}
          </span>
        )}

        {month && (
          <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ color: GOAL_COLOR, background: GOAL_COLOR + '1a' }}>
            {month}
          </span>
        )}

        {/* Points */}
        <div className="relative shrink-0">
          <button
            onClick={() => editable && setPickPoints((p) => !p)}
            className="font-display font-bold text-xs px-1.5 py-0.5 rounded"
            style={{ color: GOAL_COLOR, background: GOAL_COLOR + '22' }}
          >
            {goal.points}
          </button>
          {pickPoints && (
            <PointsPicker value={goal.points} accent={GOAL_COLOR}
              onPick={(p) => updateTask(goal.id, { points: p })} onClose={() => setPickPoints(false)} />
          )}
        </div>

        {editable && (
          <button onClick={() => deleteTask(goal.id)} className="shrink-0 p-0.5 text-slate-500 hover:text-red-400">
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {children.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: GOAL_COLOR }} />
          </div>
          <button onClick={() => setOpen((o) => !o)} className="text-[10px] text-slate-400 flex items-center gap-0.5">
            {childDone}/{children.length}
            <ChevronDown size={11} className={clsx('transition', open && 'rotate-180')} />
          </button>
        </div>
      )}

      {/* Nested to-dos */}
      {open && (
        <div className="mt-2 ml-1 space-y-1">
          {children.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs">
              <button
                onClick={() => editable && (c.status === 'done' ? reopenTask(c.id) : completeTask(c.id))}
                disabled={!editable}
                className="shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center"
                style={c.status === 'done' ? { background: GOAL_COLOR, borderColor: GOAL_COLOR } : { borderColor: '#ffffff40' }}
              >
                {c.status === 'done' && <Check size={9} strokeWidth={4} className="text-ink-900" />}
              </button>
              <span className={clsx('flex-1 truncate', c.status === 'done' && 'line-through text-slate-600')}>{c.title}</span>
              <span className="text-[10px] text-slate-500">{c.points}</span>
              {editable && (
                <button onClick={() => deleteTask(c.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={11} /></button>
              )}
            </div>
          ))}

          {editable && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <Plus size={12} className="text-slate-500 shrink-0" />
              <input
                value={newChild}
                onChange={(e) => setNewChild(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addChild()}
                placeholder="Add a step toward this goal…"
                className="flex-1 bg-transparent border-b border-white/10 focus:border-white/30 text-xs py-0.5 outline-none placeholder:text-slate-600"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
