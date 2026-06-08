import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import type { PlayerId, Task } from '../types'
import TaskCard from './TaskCard'

interface Props {
  tasks: Task[]
  owner: PlayerId
  editable: boolean
  onEdit: (task: Task) => void
}

export default function TaskList({ tasks, owner, editable, onEdit }: Props) {
  const [showDone, setShowDone] = useState(false)
  const open = tasks
    .filter((t) => t.status === 'open')
    .sort((a, b) => b.points - a.points || a.createdAt - b.createdAt)
  const done = tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

  return (
    <div className="space-y-2">
      {open.length === 0 && done.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-8">No tasks yet. Add one and strike first.</p>
      )}
      {open.map((t) => (
        <TaskCard key={t.id} task={t} editable={editable} onEdit={onEdit} />
      ))}

      {done.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowDone((s) => !s)}
            className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500 hover:text-slate-300 mb-2"
          >
            <ChevronDown size={14} className={clsx('transition', showDone && 'rotate-180')} />
            {done.length} completed
          </button>
          {showDone && (
            <div className="space-y-2">
              {done.map((t) => (
                <TaskCard key={t.id} task={t} editable={editable} onEdit={onEdit} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
