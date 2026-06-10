import { useMemo, useState } from 'react'
import { X, ListPlus, Sparkles } from 'lucide-react'
import type { PlayerId, Recurrence } from '../types'
import { useGame } from '../contexts/GameContext'
import { inferCategory } from '../services/voice'
import { suggestPoints } from '../services/suggest'
import type { NewTaskInput } from '../services/sync'

interface Props {
  owner: PlayerId
  onClose: () => void
}

interface ParsedRow {
  title: string
  category: string
  points: number
  recurrence: Recurrence
  urgency?: number
  isGoal: boolean
}

const REC_MAP: Record<string, Recurrence> = {
  daily: 'daily', weekly: 'weekly', monthly: 'monthly', day: 'daily', week: 'weekly', month: 'monthly',
}

// Parse one line. Syntax (all optional, anywhere in the line):
//   #Category   p7 (points 1-10)   !weekly (recurrence)   *2 (urgency rank)   @goal
function parseLine(raw: string, state: ReturnType<typeof useGame>['state']): ParsedRow | null {
  let line = raw.trim()
  if (!line) return null

  let category = ''
  let points: number | null = null
  let recurrence: Recurrence = 'none'
  let urgency: number | undefined
  let isGoal = false

  line = line.replace(/(^|\s)@goal\b/gi, () => { isGoal = true; return ' ' })
  line = line.replace(/(^|\s)#([\w/&+-]+)/g, (_m, _s, c) => { category = c.replace(/-/g, ' '); return ' ' })
  line = line.replace(/(^|\s)p(\d{1,2})\b/gi, (_m, _s, n) => { points = Math.max(1, Math.min(10, parseInt(n, 10))); return ' ' })
  line = line.replace(/(^|\s)!(\w+)/g, (_m, _s, r) => { recurrence = REC_MAP[r.toLowerCase()] ?? 'none'; return ' ' })
  line = line.replace(/(^|\s)\*(\d{1,3})\b/g, (_m, _s, n) => { urgency = parseInt(n, 10); return ' ' })

  const title = line.replace(/\s+/g, ' ').trim()
  if (!title) return null

  const cat = category || inferCategory(title)
  const pts = points ?? suggestPoints(title, cat, state).points
  return { title, category: cat, points: pts, recurrence, urgency, isGoal }
}

// Turn a free-form brain-dump (paragraphs, numbered lists, bullets, "and then…")
// into one candidate task per line. The live preview lets you sanity-check the split.
function splitIntoTaskLines(raw: string): string[] {
  return raw
    .replace(/\r/g, '\n')
    // strip filler preamble dictation often starts with ("OK so I need to …")
    .replace(/^\s*(?:(?:ok|okay|so|alright|well|um+|uh+|i need to|i gotta|i have to|i want to|i should)[\s,]+)+/i, '')
    // break before inline numbered markers:  "1. " "2) " "3:"
    .replace(/\s+(?=\d{1,2}[.):]\s)/g, '\n')
    // bullets → newline
    .replace(/[•▪◦●]\s*/g, '\n')
    // strong separators → newline
    .replace(/;\s*/g, '\n')
    // run-on dictation joiners → newline
    .replace(/\s*,?\s*\b(?:and then|then|after that|next|also|plus)\b\s+/gi, '\n')
    // remaining commas and standalone "and" between clauses → newline
    .replace(/\s*,\s*and\s+/gi, '\n')
    .replace(/\s*,\s+/g, '\n')
    .replace(/\s+and\s+/gi, '\n')
    .split('\n')
    .map((s) =>
      s
        // strip leading list markers: "1." "2)" "- " "* " "•"
        .replace(/^\s*(?:\d{1,2}[.):]|[-–—*•])\s*/, '')
        // tidy trailing period / "asap" noise stays; just trim
        .trim(),
    )
    .filter((s) => s.length >= 2)
}

export default function BulkAddModal({ owner, onClose }: Props) {
  const { state, bulkAddTasks } = useGame()
  const [text, setText] = useState('')
  const accent = owner === 'cam' ? '#00E5FF' : '#FF2BD6'

  const rows = useMemo(
    () => splitIntoTaskLines(text).map((l) => parseLine(l, state)).filter(Boolean) as ParsedRow[],
    [text, state],
  )

  function commit() {
    if (!rows.length) return
    const inputs: NewTaskInput[] = rows.map((r, i) => ({
      owner, title: r.title, category: r.category, points: r.points,
      recurrence: r.recurrence !== 'none' ? r.recurrence : undefined,
      isGoal: r.isGoal || undefined,
      // explicit *urgency wins; otherwise preserve the typed order
      order: r.urgency ?? 1000 + i,
    }))
    bulkAddTasks(inputs)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6" onClick={onClose}>
      <div className="panel w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin rounded-b-none sm:rounded-2xl p-5 animate-rise"
        style={{ borderColor: accent + '55' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-display font-bold flex items-center gap-2" style={{ color: accent }}>
            <ListPlus size={20} /> Bulk add
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={22} /></button>
        </div>

        <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
          <Sparkles size={12} /> Dump a brain-dump or dictate a whole list — I'll split it into tasks. Numbered lists, bullets, semicolons, and "…and then…" all work.
        </p>
        <div className="text-[10px] text-slate-500 mb-2 font-mono bg-ink-800 rounded-lg px-3 py-2">
          Optional tags anywhere: <span className="text-slate-300">#Category</span> · <span className="text-slate-300">p7</span> (points) · <span className="text-slate-300">!weekly</span> (repeat) · <span className="text-slate-300">*2</span> (urgency) · <span className="text-slate-300">@goal</span>
        </div>

        <textarea
          autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={8}
          placeholder={`Paste or dictate anything, e.g.:\n\nOK so I need to email all the tenants about renewals every week, then set up the LinkedIn campaign for SBL, close the NJ deal it's huge, send the lender all their docs asap, and pay physical therapy.\n\n— or a clean list —\n1. Email campaign to sellers #Sales\n2. Kodiak closing MSA #Deals p9\n3. Raise seed round @goal p10`}
          className="w-full bg-ink-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 resize-y leading-relaxed placeholder:text-slate-600"
        />

        {rows.length > 0 && (
          <div className="mt-3">
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-1.5">Preview · {rows.length} task{rows.length > 1 ? 's' : ''}</div>
            <div className="max-h-52 overflow-y-auto scrollbar-thin rounded-lg border border-white/5 divide-y divide-white/5">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  <span className="font-display font-bold text-xs px-1.5 py-0.5 rounded shrink-0" style={{ color: accent, background: accent + '18' }}>{r.points}</span>
                  <span className="flex-1 truncate">{r.title}</span>
                  {r.isGoal && <span className="text-[10px] text-gold">goal</span>}
                  {r.recurrence !== 'none' && <span className="text-[10px] text-slate-500">{r.recurrence}</span>}
                  <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-white/5">{r.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={commit} disabled={!rows.length}
          className="w-full mt-4 py-3 rounded-xl font-display font-bold text-ink-900 disabled:opacity-40 transition" style={{ background: accent }}>
          Add {rows.length || ''} task{rows.length === 1 ? '' : 's'} to the war
        </button>
      </div>
    </div>
  )
}
