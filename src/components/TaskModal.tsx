import { useMemo, useRef, useState } from 'react'
import { X, Sparkles, Pencil, Plus, Trash2, Target } from 'lucide-react'
import { POINTS_RUBRIC, rubricFor, type PlayerId, type Recurrence, type Task } from '../types'
import { useGame } from '../contexts/GameContext'
import { inferCategory } from '../services/voice'
import { suggestPoints } from '../services/suggest'

interface Props {
  owner: PlayerId
  existing?: Task
  /** Pre-create as a goal (from the Goals "+"). */
  defaultGoal?: boolean
  onClose: () => void
}

const SUGGESTED = ['Sales', 'Deals', 'Legal', 'Ops', 'Fundraising', 'AI / Automation', 'General']
const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

// ── Quick-add (NL text box) ───────────────────────────────────────────────────
function QuickAdd({ owner, accent, onClose, onManual }: {
  owner: PlayerId; accent: string; onClose: () => void; onManual: () => void
}) {
  const { state, addTask } = useGame()
  const [text, setText] = useState('')
  const [feedback, setFeedback] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  function submit() {
    const t = text.trim()
    if (!t) return
    const title = t.replace(/^(add|new|create|track|log|i need to|gotta|remember to)\s+/i, '').trim()
    const cat = inferCategory(t)
    const sug = suggestPoints(title, cat, state)
    addTask({ owner, title, category: cat, points: sug.points })
    setFeedback(`✅ Added "${title}" · ${sug.points}pt · ${cat}`)
    setText('')
    setTimeout(onClose, 1100)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-slate-400 flex items-center gap-1.5">
        <Sparkles size={12} /> Use Wispr Flow to dictate — just describe the task naturally.
      </div>
      <textarea
        ref={ref} autoFocus value={text}
        onChange={(e) => { setText(e.target.value); setFeedback('') }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        rows={4}
        placeholder={`"Negotiate the NJ deal, it's a major deal due next week"\n"Send Richard the sales process, quick task"\n"Build Claude auto-outreach tool, huge AI project"`}
        className="w-full bg-ink-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 resize-none placeholder:text-slate-600 leading-relaxed"
      />
      {feedback && <div className="text-sm text-win">{feedback}</div>}
      <button onClick={submit} disabled={!text.trim()}
        className="w-full py-3 rounded-xl font-display font-bold text-ink-900 disabled:opacity-40 transition" style={{ background: accent }}>
        Add to the war ↵
      </button>
      <button onClick={onManual} className="text-xs text-slate-500 hover:text-slate-300 text-center flex items-center justify-center gap-1">
        <Pencil size={11} /> Fill in details manually
      </button>
    </div>
  )
}

// ── Manual form ───────────────────────────────────────────────────────────────
function ManualForm({ owner, accent, existing, defaultGoal, onClose }: {
  owner: PlayerId; accent: string; existing?: Task; defaultGoal?: boolean; onClose: () => void
}) {
  const { state, addTask, updateTask } = useGame()
  const [title, setTitle] = useState(existing?.title ?? '')
  const [category, setCategory] = useState(existing?.category ?? 'General')
  const [points, setPoints] = useState<number>(existing?.points ?? 3)
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [isGoal, setIsGoal] = useState(existing?.isGoal ?? defaultGoal ?? false)
  const [targetMonth, setTargetMonth] = useState(existing?.targetMonth ?? '')
  const [recurrence, setRecurrence] = useState<Recurrence>(existing?.recurrence ?? 'none')
  const [subtasks, setSubtasks] = useState<string[]>(existing?.subtasks.map((s) => s.title) ?? [])
  const [draftSub, setDraftSub] = useState('')
  const [touchedPoints, setTouchedPoints] = useState(!!existing)

  // Live suggestion from history (only before the user picks manually).
  const suggestion = useMemo(
    () => (title.trim() && !touchedPoints ? suggestPoints(title, category, state) : null),
    [title, category, state, touchedPoints],
  )

  function addSub() {
    const v = draftSub.trim()
    if (!v) return
    setSubtasks((s) => [...s, v]); setDraftSub('')
  }
  function save() {
    if (!title.trim()) return
    if (existing) {
      updateTask(existing.id, {
        title: title.trim(), category, points,
        dueDate: dueDate || undefined, notes: notes.trim() || undefined,
        isGoal: isGoal || undefined, targetMonth: targetMonth || undefined,
        recurrence: recurrence !== 'none' ? recurrence : undefined,
        subtasks: subtasks.map((t, i) => ({
          id: existing.subtasks[i]?.id ?? crypto.randomUUID(), title: t, done: existing.subtasks[i]?.done ?? false,
        })),
      })
    } else {
      addTask({
        owner, title, category, points, dueDate: dueDate || undefined, notes, subtasks,
        isGoal: isGoal || undefined, targetMonth: targetMonth || undefined,
        recurrence: recurrence !== 'none' ? recurrence : undefined,
      })
    }
    onClose()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Goal toggle */}
      <button
        onClick={() => setIsGoal((g) => !g)}
        className="flex items-center gap-2 text-sm self-start px-3 py-1.5 rounded-lg border transition"
        style={isGoal
          ? { background: '#FFC53D22', borderColor: '#FFC53D', color: '#FFC53D' }
          : { borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}
      >
        <Target size={14} /> {isGoal ? 'This is a GOAL' : 'Make it a goal'}
      </button>

      <div>
        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">{isGoal ? 'Goal' : 'Task'}</label>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder={isGoal ? 'e.g. Raise the seed round' : 'e.g. Sign the Kodiak MSA'}
          className="w-full bg-ink-800 border border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-white/30" />
      </div>

      {isGoal && (
        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Target month</label>
          <input type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)}
            className="w-full bg-ink-800 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 [color-scheme:dark]" />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs uppercase tracking-wider text-slate-400">Points · {rubricFor(points).label}</label>
          {suggestion && (
            <button onClick={() => { setPoints(suggestion.points); setTouchedPoints(true) }}
              className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: accent + '22', color: accent }}>
              <Sparkles size={10} /> Suggested {suggestion.points}
              <span className="text-slate-500">{suggestion.source === 'history' ? `(${suggestion.basedOn} similar)` : ''}</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {POINTS_RUBRIC.map((t) => {
            const active = points === t.value
            return (
              <button key={t.value} onClick={() => { setPoints(t.value); setTouchedPoints(true) }} title={`${t.label} — ${t.blurb}`}
                className={['rounded-lg py-2 border text-center transition', active ? 'text-ink-900 font-bold' : 'text-slate-300 border-white/10 bg-ink-800'].join(' ')}
                style={active ? { background: accent, borderColor: accent } : undefined}>
                <div className="text-base font-display leading-none">{t.value}</div>
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-500 mt-1">{points} · {rubricFor(points).label} — {rubricFor(points).blurb}</p>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Category</label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={['px-2.5 py-1 rounded-full text-xs border transition', category === c ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-slate-400 hover:text-slate-200'].join(' ')}>{c}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Due date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full bg-ink-800 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 [color-scheme:dark]" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Repeat</label>
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            className="w-full bg-ink-800 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30">
            {RECURRENCES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {subtasks.length > 0 && (
        <ul className="space-y-1">
          {subtasks.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-sm bg-ink-800 rounded-lg px-3 py-1.5">
              <span className="flex-1">{s}</span>
              <button onClick={() => setSubtasks((a) => a.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input value={draftSub} onChange={(e) => setDraftSub(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSub())}
          placeholder={isGoal ? 'Add a step toward this goal…' : 'Add a sub-step…'}
          className="flex-1 bg-ink-800 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30" />
        <button onClick={addSub} className="px-3 rounded-xl bg-white/10 hover:bg-white/20"><Plus size={18} /></button>
      </div>

      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes (optional)"
        className="w-full bg-ink-800 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 resize-none" />

      <button onClick={save} disabled={!title.trim()}
        className="w-full py-3 rounded-xl font-display font-bold text-ink-900 disabled:opacity-40 transition" style={{ background: accent }}>
        {existing ? 'Save changes' : isGoal ? 'Set the goal' : 'Add to the war'}
      </button>
    </div>
  )
}

export default function TaskModal({ owner, existing, defaultGoal, onClose }: Props) {
  const accent = owner === 'cam' ? '#00E5FF' : '#FF2BD6'
  const [mode, setMode] = useState<'quick' | 'manual'>(existing || defaultGoal ? 'manual' : 'quick')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6" onClick={onClose}>
      <div className="panel w-full sm:max-w-lg max-h-[92vh] overflow-y-auto scrollbar-thin rounded-b-none sm:rounded-2xl p-5 animate-rise"
        style={{ borderColor: accent + '55' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold" style={{ color: accent }}>
            {existing ? 'Edit' : mode === 'quick' ? 'Add a task' : defaultGoal ? 'New goal' : 'New task'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={22} /></button>
        </div>
        {mode === 'quick' && !existing && !defaultGoal
          ? <QuickAdd owner={owner} accent={accent} onClose={onClose} onManual={() => setMode('manual')} />
          : <ManualForm owner={owner} accent={accent} existing={existing} defaultGoal={defaultGoal} onClose={onClose} />}
      </div>
    </div>
  )
}
