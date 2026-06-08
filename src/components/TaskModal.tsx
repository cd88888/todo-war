import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { TIERS, type PlayerId, type PointsTier, type Task } from '../types'
import { useGame } from '../contexts/GameContext'

interface Props {
  owner: PlayerId
  existing?: Task
  onClose: () => void
}

const SUGGESTED = ['Sales', 'Deals', 'Legal', 'Ops', 'Fundraising', 'AI / Automation', 'General']

export default function TaskModal({ owner, existing, onClose }: Props) {
  const { addTask, updateTask } = useGame()
  const [title, setTitle] = useState(existing?.title ?? '')
  const [category, setCategory] = useState(existing?.category ?? 'Sales')
  const [points, setPoints] = useState<PointsTier>(existing?.points ?? 3)
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [subtasks, setSubtasks] = useState<string[]>(
    existing?.subtasks.map((s) => s.title) ?? [],
  )
  const [draftSub, setDraftSub] = useState('')

  const accent = owner === 'cam' ? '#00E5FF' : '#FF2BD6'

  function addSub() {
    const v = draftSub.trim()
    if (!v) return
    setSubtasks((s) => [...s, v])
    setDraftSub('')
  }

  function save() {
    if (!title.trim()) return
    if (existing) {
      updateTask(existing.id, {
        title: title.trim(),
        category,
        points,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        // preserve done-state of existing subtasks, append any new ones
        subtasks: subtasks.map((t, i) => ({
          id: existing.subtasks[i]?.id ?? crypto.randomUUID(),
          title: t,
          done: existing.subtasks[i]?.done ?? false,
        })),
      })
    } else {
      addTask({ owner, title, category, points, dueDate: dueDate || undefined, notes, subtasks })
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="panel w-full sm:max-w-lg max-h-[92vh] overflow-y-auto scrollbar-thin rounded-b-none sm:rounded-2xl p-5 animate-rise"
        style={{ borderColor: accent + '55' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold" style={{ color: accent }}>
            {existing ? 'Edit task' : 'New task'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Task</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="e.g. Sign the Kodiak MSA"
          className="w-full bg-ink-800 border border-white/10 rounded-xl px-3 py-2.5 mb-4 outline-none focus:border-white/30"
        />

        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
          Difficulty (points)
        </label>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {TIERS.map((t) => {
            const active = points === t.value
            return (
              <button
                key={t.value}
                onClick={() => setPoints(t.value)}
                className={[
                  'rounded-xl py-2 border text-center transition',
                  active ? 'text-ink-900 font-bold' : 'text-slate-300 border-white/10 bg-ink-800',
                ].join(' ')}
                style={active ? { background: accent, borderColor: accent } : undefined}
              >
                <div className="text-lg font-display leading-none">{t.value}</div>
                <div className="text-[10px] mt-0.5 opacity-80">{t.label}</div>
              </button>
            )
          })}
        </div>

        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Category</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {SUGGESTED.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={[
                'px-2.5 py-1 rounded-full text-xs border transition',
                category === c
                  ? 'border-white/40 bg-white/10 text-white'
                  : 'border-white/10 text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-ink-800 border border-white/10 rounded-xl px-3 py-2 mb-4 text-sm outline-none focus:border-white/30"
        />

        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
          Due date (optional)
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full bg-ink-800 border border-white/10 rounded-xl px-3 py-2 mb-4 text-sm outline-none focus:border-white/30 [color-scheme:dark]"
        />

        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
          Subtasks (optional)
        </label>
        {subtasks.length > 0 && (
          <ul className="mb-2 space-y-1">
            {subtasks.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm bg-ink-800 rounded-lg px-3 py-1.5">
                <span className="flex-1">{s}</span>
                <button
                  onClick={() => setSubtasks((arr) => arr.filter((_, j) => j !== i))}
                  className="text-slate-500 hover:text-red-400"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 mb-4">
          <input
            value={draftSub}
            onChange={(e) => setDraftSub(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSub())}
            placeholder="Add a step…"
            className="flex-1 bg-ink-800 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30"
          />
          <button onClick={addSub} className="px-3 rounded-xl bg-white/10 hover:bg-white/20">
            <Plus size={18} />
          </button>
        </div>

        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-ink-800 border border-white/10 rounded-xl px-3 py-2 mb-5 text-sm outline-none focus:border-white/30 resize-none"
        />

        <button
          onClick={save}
          disabled={!title.trim()}
          className="w-full py-3 rounded-xl font-display font-bold text-ink-900 disabled:opacity-40 transition"
          style={{ background: accent }}
        >
          {existing ? 'Save changes' : 'Add to the war'}
        </button>
      </div>
    </div>
  )
}
