import { useState } from 'react'
import { Check, Pencil, Trash2, ChevronDown, RotateCcw, CalendarClock } from 'lucide-react'
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
  if (days === 0) return { label: 'Due today', overdue: false }
  if (days === 1) return { label: 'Due tomorrow', overdue: false }
  return { label: `Due in ${days}d`, overdue: false }
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
        'panel scanlines relative rounded-xl p-3 transition',
        done && 'opacity-55',
      )}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => (done ? reopenTask(task.id) : completeTask(task.id))}
          disabled={!editable}
          title={editable ? (done ? 'Re-open' : 'Complete') : 'Only the owner can check this off'}
          className={clsx(
            'mt-0.5 shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition',
            done ? 'text-ink-900' : 'border-white/25 hover:border-white/60',
            !editable && 'cursor-not-allowed',
          )}
          style={done ? { background: accent, borderColor: accent } : { borderColor: accent + '88' }}
        >
          {done && <Check size={15} strokeWidth={4} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx('font-medium leading-snug', done && 'line-through')}>
              {task.title}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-white/5">{task.category}</span>
            {due && (
              <span className={clsx('inline-flex items-center gap-1', due.overdue && 'text-red-400')}>
                <CalendarClock size={11} /> {due.label}
              </span>
            )}
            {task.subtasks.length > 0 && (
              <button
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-1 hover:text-slate-200"
              >
                <ChevronDown size={12} className={clsx('transition', open && 'rotate-180')} />
                {subDone}/{task.subtasks.length} steps
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className="font-display font-bold text-sm px-2 py-1 rounded-lg"
            style={{ color: accent, background: accent + '1a' }}
          >
            {task.points}
          </span>
          {editable && (
            <>
              <button
                onClick={() => onEdit(task)}
                className="p-1.5 text-slate-500 hover:text-slate-200"
                title="Edit"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => deleteTask(task.id)}
                className="p-1.5 text-slate-500 hover:text-red-400"
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {open && task.subtasks.length > 0 && (
        <ul className="mt-2 ml-9 space-y-1">
          {task.subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <button
                onClick={() => editable && toggleSubtask(task.id, s.id)}
                disabled={!editable}
                className={clsx(
                  'w-4 h-4 rounded border flex items-center justify-center',
                  s.done ? 'bg-white/70 border-white/70 text-ink-900' : 'border-white/25',
                )}
              >
                {s.done && <Check size={11} strokeWidth={4} />}
              </button>
              <span className={clsx(s.done && 'line-through text-slate-500')}>{s.title}</span>
            </li>
          ))}
        </ul>
      )}

      {done && editable && (
        <button
          onClick={() => reopenTask(task.id)}
          className="absolute top-2 right-2 hidden"
          aria-hidden
        >
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  )
}
