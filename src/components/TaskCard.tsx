import { useState } from 'react'
import { Check, Pencil, Trash2, ChevronDown, CalendarClock } from 'lucide-react'
import clsx from 'clsx'
import type { Task } from '../types'
import { useGame } from '../contexts/GameContext'

interface Props {
  task: Task
  editable: boolean
  onEdit: (task: Task) => void
}

function dueMeta(due?: string): { label: string; overdue: boolean } | null {
  if (!due) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T00:00:00')
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return { label: `${-days}d overdue`, overdue: true }
  if (days === 0) return { label: 'today', overdue: false }
  if (days === 1) return { label: 'tmrw', overdue: false }
  return { label: `${days}d`, overdue: false }
}

export default function TaskCard({ task, editable, onEdit }: Props) {
  const { completeTask, reopenTask, deleteTask, toggleSubtask } = useGame()
  const [open, setOpen] = useState(false)
  const accent = task.owner === 'cam' ? '#00E5FF' : '#FF2BD6'
  const done = task.status === 'done'
  const due = dueMeta(task.dueDate)
  const subDone = task.subtasks.filter((s) => s.done).length

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-2 py-1.5 rounded-lg transition group',
        done ? 'opacity-40' : 'hover:bg-white/5',
      )}
      style={{ borderLeft: `2px solid ${done ? accent + '55' : accent}` }}
    >
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

      {/* Title */}
      <span className={clsx('flex-1 text-sm leading-tight truncate', done && 'line-through text-slate-500')}>
        {task.title}
      </span>

      {/* Meta row (due, subtasks) — only if present */}
      <div className="flex items-center gap-1.5 shrink-0">
        {due && (
          <span className={clsx('text-[10px]', due.overdue ? 'text-red-400' : 'text-slate-500')}>
            <CalendarClock size={10} className="inline mr-0.5" />{due.label}
          </span>
        )}
        {task.subtasks.length > 0 && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5"
          >
            {subDone}/{task.subtasks.length}
            <ChevronDown size={10} className={clsx('transition', open && 'rotate-180')} />
          </button>
        )}
        {/* Points badge */}
        <span
          className="font-display font-bold text-xs px-1.5 py-0.5 rounded"
          style={{ color: accent, background: accent + '18' }}
        >
          {task.points}
        </span>
        {/* Edit/Delete — visible on hover only */}
        {editable && (
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button onClick={() => onEdit(task)} className="p-1 text-slate-500 hover:text-slate-200">
              <Pencil size={12} />
            </button>
            <button onClick={() => deleteTask(task.id)} className="p-1 text-slate-500 hover:text-red-400">
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Subtasks expandable */}
      {open && task.subtasks.length > 0 && (
        <ul className="col-span-full ml-7 mt-1 space-y-0.5 w-full">
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
