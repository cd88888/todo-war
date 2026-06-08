import { useEffect, useRef, useState } from 'react'
import {
  Check, Trash2, ChevronDown, CalendarClock, GripVertical, ChevronUp, Repeat,
} from 'lucide-react'
import clsx from 'clsx'
import type { Task } from '../types'
import { GOAL_COLOR } from '../types'
import { useGame } from '../contexts/GameContext'
import PointsPicker from './PointsPicker'

interface Props {
  task: Task
  editable: boolean
  /** Urgency reorder controls (omit for completed/rival lists). */
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst?: boolean
  isLast?: boolean
  /** Native drag handlers from the list. */
  dragProps?: {
    onDragStart: () => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: () => void
    dragging: boolean
    over: boolean
  }
}

function dueMeta(due?: string): { label: string; overdue: boolean } | null {
  if (!due) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T00:00:00')
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return { label: `${-days}d over`, overdue: true }
  if (days === 0) return { label: 'today', overdue: false }
  if (days === 1) return { label: 'tmrw', overdue: false }
  return { label: `${days}d`, overdue: false }
}

export default function TaskCard({
  task, editable, onMoveUp, onMoveDown, isFirst, isLast, dragProps,
}: Props) {
  const { completeTask, reopenTask, deleteTask, toggleSubtask, updateTask } = useGame()
  const [open, setOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(task.title)
  const [editingDue, setEditingDue] = useState(false)
  const [pickPoints, setPickPoints] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const accent = task.owner === 'cam' ? '#00E5FF' : '#FF2BD6'
  const done = task.status === 'done'
  const due = dueMeta(task.dueDate)
  const subDone = task.subtasks.filter((s) => s.done).length

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus()
  }, [editingTitle])

  function saveTitle() {
    const v = draftTitle.trim()
    if (v && v !== task.title) updateTask(task.id, { title: v })
    else setDraftTitle(task.title)
    setEditingTitle(false)
  }

  return (
    <div
      draggable={editable && !!dragProps && !editingTitle}
      onDragStart={dragProps?.onDragStart}
      onDragOver={dragProps?.onDragOver}
      onDrop={dragProps?.onDrop}
      className={clsx(
        'flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition group relative',
        done ? 'opacity-40' : 'hover:bg-white/5',
        dragProps?.dragging && 'opacity-30',
        dragProps?.over && 'ring-1 ring-white/40',
      )}
      style={{ borderLeft: `2px solid ${done ? accent + '55' : accent}` }}
    >
      {/* Drag handle (desktop) */}
      {editable && dragProps && !done && (
        <GripVertical
          size={13}
          className="shrink-0 text-slate-600 group-hover:text-slate-400 cursor-grab active:cursor-grabbing hidden sm:block"
        />
      )}

      {/* Checkbox */}
      <button
        onClick={() => (done ? reopenTask(task.id) : completeTask(task.id))}
        disabled={!editable}
        title={editable ? (done ? 'Re-open' : 'Complete') : 'Only the owner can check this off'}
        className={clsx(
          'shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition',
          !editable && 'cursor-not-allowed',
        )}
        style={done ? { background: accent, borderColor: accent } : { borderColor: accent + '66' }}
      >
        {done && <Check size={12} strokeWidth={4} />}
      </button>

      {/* Title — click to edit inline */}
      {editingTitle ? (
        <input
          ref={titleRef}
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveTitle()
            if (e.key === 'Escape') { setDraftTitle(task.title); setEditingTitle(false) }
          }}
          className="flex-1 min-w-0 bg-ink-700 border border-white/20 rounded px-1.5 py-0.5 text-sm outline-none"
        />
      ) : (
        <span
          onClick={() => editable && !done && (setDraftTitle(task.title), setEditingTitle(true))}
          className={clsx(
            'flex-1 text-sm leading-tight truncate',
            done && 'line-through text-slate-500',
            editable && !done && 'cursor-text hover:text-white',
          )}
        >
          {task.title}
        </span>
      )}

      {/* Meta */}
      <div className="flex items-center gap-1.5 shrink-0">
        {task.recurrence && task.recurrence !== 'none' && (
          <Repeat size={11} className="text-slate-500" />
        )}
        {/* Due — click to edit */}
        {editingDue ? (
          <input
            type="date"
            autoFocus
            defaultValue={task.dueDate ?? ''}
            onBlur={(e) => { updateTask(task.id, { dueDate: e.target.value || undefined }); setEditingDue(false) }}
            className="bg-ink-700 border border-white/20 rounded px-1 text-[10px] outline-none [color-scheme:dark]"
          />
        ) : due ? (
          <button
            onClick={() => editable && setEditingDue(true)}
            className={clsx('text-[10px]', due.overdue ? 'text-red-400' : 'text-slate-500', editable && 'hover:text-slate-300')}
          >
            <CalendarClock size={10} className="inline mr-0.5" />{due.label}
          </button>
        ) : editable && !done ? (
          <button onClick={() => setEditingDue(true)} className="text-slate-700 hover:text-slate-400">
            <CalendarClock size={11} />
          </button>
        ) : null}

        {task.subtasks.length > 0 && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5"
          >
            {subDone}/{task.subtasks.length}
            <ChevronDown size={10} className={clsx('transition', open && 'rotate-180')} />
          </button>
        )}

        {/* Points badge — click to re-score */}
        <div className="relative">
          <button
            onClick={() => editable && setPickPoints((p) => !p)}
            className="font-display font-bold text-xs px-1.5 py-0.5 rounded transition"
            style={{ color: task.isGoal ? GOAL_COLOR : accent, background: (task.isGoal ? GOAL_COLOR : accent) + '18' }}
            title={editable ? 'Change difficulty' : undefined}
          >
            {task.points}
          </button>
          {pickPoints && (
            <PointsPicker
              value={task.points}
              accent={accent}
              onPick={(p) => updateTask(task.id, { points: p })}
              onClose={() => setPickPoints(false)}
            />
          )}
        </div>

        {/* Reorder + delete — hover only */}
        {editable && (
          <div className="hidden group-hover:flex items-center gap-0.5">
            {onMoveUp && (
              <button onClick={onMoveUp} disabled={isFirst}
                className="p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-20" title="More urgent">
                <ChevronUp size={13} />
              </button>
            )}
            {onMoveDown && (
              <button onClick={onMoveDown} disabled={isLast}
                className="p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-20" title="Less urgent">
                <ChevronDown size={13} />
              </button>
            )}
            <button onClick={() => deleteTask(task.id)} className="p-0.5 text-slate-500 hover:text-red-400" title="Delete">
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Subtasks */}
      {open && task.subtasks.length > 0 && (
        <ul className="absolute left-9 right-2 top-full z-10 mt-0.5 bg-ink-700 rounded-lg p-2 space-y-0.5 shadow-card">
          {task.subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs text-slate-400">
              <button
                onClick={() => editable && toggleSubtask(task.id, s.id)}
                disabled={!editable}
                className={clsx(
                  'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                  s.done ? 'bg-white/70 border-white/70 text-ink-900' : 'border-white/25',
                )}
              >
                {s.done && <Check size={9} strokeWidth={4} />}
              </button>
              <span className={clsx(s.done && 'line-through text-slate-600')}>{s.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
