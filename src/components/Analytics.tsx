import { useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import {
  Activity, Download, Upload, Flame, CheckCircle2, Pencil, Plus, RotateCcw,
  Trophy, Trash2, Target,
} from 'lucide-react'
import type { GameEvent, GameState, PlayerId } from '../types'
import { PERIODS, PLAYERS } from '../types'
import { computeBoard } from '../services/scoring'
import LeaderboardChart from './LeaderboardChart'
import { useGame } from '../contexts/GameContext'

const DAY = 86_400_000

function relTime(ts: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function eventIcon(type: GameEvent['type']) {
  switch (type) {
    case 'completed': return <CheckCircle2 size={13} className="text-win" />
    case 'created': return <Plus size={13} className="text-slate-400" />
    case 'edited': return <Pencil size={13} className="text-slate-400" />
    case 'point_change': return <Activity size={13} className="text-warn" />
    case 'reopened': return <RotateCcw size={13} className="text-slate-400" />
    case 'deleted': return <Trash2 size={13} className="text-red-400" />
    case 'lead_change': return <Trophy size={13} className="text-gold" />
    case 'milestone': return <Target size={13} className="text-gold" />
    default: return <Activity size={13} className="text-slate-400" />
  }
}

/** Current daily completion streak for a player. */
function streak(state: GameState, player: PlayerId, now: number): number {
  const days = new Set(
    state.tasks
      .filter((t) => t.owner === player && t.status === 'done' && t.completedAt)
      .map((t) => Math.floor((t.completedAt! ) / DAY)),
  )
  let count = 0
  let cursor = Math.floor(now / DAY)
  // allow today to be empty without breaking a streak that ran through yesterday
  if (!days.has(cursor)) cursor -= 1
  while (days.has(cursor)) { count++; cursor-- }
  return count
}

export default function Analytics({ onClose }: { onClose: () => void }) {
  const { state, replaceAll } = useGame()
  const now = Date.now()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [pendingState, setPendingState] = useState<GameState | null>(null)
  const [confirmText, setConfirmText] = useState('')

  // ── Points by category ──────────────────────────────────────────────────────
  const catData = useMemo(() => {
    const map = new Map<string, { cam: number; arthur: number }>()
    for (const t of state.tasks) {
      if (t.status !== 'done') continue
      const e = map.get(t.category) ?? { cam: 0, arthur: 0 }
      if (t.owner === 'cam') e.cam += t.points
      else e.arthur += t.points
      map.set(t.category, e)
    }
    return Array.from(map.entries())
      .map(([category, v]) => ({ category, ...v, total: v.cam + v.arthur }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [state.tasks])

  // ── Win-rate per period ─────────────────────────────────────────────────────
  const periodStats = PERIODS.map((p) => {
    const b = computeBoard(state, p.key, now)
    return { ...p, board: b }
  })

  const counts = {
    cam: state.tasks.filter((t) => t.owner === 'cam' && t.status === 'done').length,
    arthur: state.tasks.filter((t) => t.owner === 'arthur' && t.status === 'done').length,
  }
  const streaks = {
    cam: streak(state, 'cam', now),
    arthur: streak(state, 'arthur', now),
  }

  const events = [...state.events].sort((a, b) => b.ts - a.ts).slice(0, 200)

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `todo-war-backup-${new Date(now).toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as GameState
        if (!Array.isArray(parsed.tasks)) throw new Error('bad file')
        setPendingState(parsed)
        setConfirmRestore(true)
      } catch {
        alert('That file does not look like a TODO WAR backup.')
      }
    }
    reader.readAsText(file)
  }

  function doRestore() {
    if (pendingState && confirmText === 'RESTORE') {
      replaceAll(pendingState)
      setConfirmRestore(false)
      setPendingState(null)
      setConfirmText('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-ink-900/95 backdrop-blur overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display font-black flex items-center gap-2">
            <Activity className="text-cam" size={22} /> Stats & History
          </h2>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm">Close</button>
        </div>

        {/* Headline stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {(['cam', 'arthur'] as PlayerId[]).map((pid) => (
            <div key={pid} className="panel rounded-xl p-3" style={{ borderColor: PLAYERS[pid].color + '40' }}>
              <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: PLAYERS[pid].color }}>
                {PLAYERS[pid].emoji} {PLAYERS[pid].name}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                <span><b className="text-slate-100 text-base">{counts[pid]}</b> done</span>
                <span className="flex items-center gap-1">
                  <Flame size={12} className={streaks[pid] > 0 ? 'text-warn' : 'text-slate-600'} />
                  <b className="text-slate-100 text-base">{streaks[pid]}</b> day streak
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Points over time */}
        <div className="panel rounded-xl p-3 mb-5">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Points · last 14 days</div>
          <LeaderboardChart state={state} days={14} height={150} />
        </div>

        {/* Win-rate per period */}
        <div className="grid grid-cols-5 gap-2 mb-5">
          {periodStats.map(({ key, label, board }) => {
            const leadColor = board.leader ? PLAYERS[board.leader].color : '#64748b'
            return (
              <div key={key} className="panel rounded-xl p-2 text-center">
                <div className="text-[10px] uppercase tracking-wide text-slate-500 truncate">{label}</div>
                <div className="font-display font-bold text-sm mt-1">
                  <span className="text-cam">{board.cam}</span>
                  <span className="text-slate-600 mx-0.5">·</span>
                  <span className="text-arthur">{board.arthur}</span>
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: leadColor }}>
                  {board.leader ? `${PLAYERS[board.leader].name} +${board.margin}` : 'tie'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Points by category */}
        {catData.length > 0 && (
          <div className="panel rounded-xl p-3 mb-5">
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Points by category</div>
            <ResponsiveContainer width="100%" height={Math.max(120, catData.length * 30)}>
              <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid stroke="#ffffff10" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#10101e', border: '1px solid #ffffff20', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="cam" stackId="a" name="Cam" fill="#00E5FF" radius={[3, 0, 0, 3]} />
                <Bar dataKey="arthur" stackId="a" name="Arthur" fill="#FF2BD6" radius={[0, 3, 3, 0]}>
                  {catData.map((_, i) => <Cell key={i} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-1">
              {catData.map((c) => (
                <span key={c.category} className="text-[10px] text-slate-500">{c.category} ({c.total})</span>
              ))}
            </div>
          </div>
        )}

        {/* Activity log */}
        <div className="panel rounded-xl p-3 mb-5">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Activity log · audit trail</div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-white/5">
            {events.length === 0 && <p className="text-slate-500 text-sm py-4 text-center">No activity yet.</p>}
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 py-1.5 text-sm">
                {eventIcon(ev.type)}
                <span className="font-semibold shrink-0" style={{ color: PLAYERS[ev.playerId].color }}>
                  {PLAYERS[ev.playerId].name}
                </span>
                <span className="flex-1 text-slate-300 truncate">{ev.message}</span>
                <span className="text-[10px] text-slate-600 shrink-0">{relTime(ev.ts, now)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Backup / restore */}
        <div className="panel rounded-xl p-3">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Backup</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportJSON} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm">
              <Download size={15} /> Export backup (JSON)
            </button>
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm">
              <Upload size={15} /> Restore from backup
            </button>
            <input ref={fileRef} type="file" accept="application/json" onChange={onPickFile} className="hidden" />
          </div>
          <p className="text-[10px] text-slate-600 mt-2">
            Tip: a nightly snapshot is also committed to the GitHub repo once Supabase is connected.
          </p>
        </div>
      </div>

      {/* Restore confirm */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setConfirmRestore(false)}>
          <div className="panel rounded-2xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-warn mb-2">Overwrite everything?</h3>
            <p className="text-sm text-slate-300 mb-3">
              This replaces all current tasks & history with the backup
              ({pendingState?.tasks.length ?? 0} tasks). Type <b className="text-white">RESTORE</b> to confirm.
            </p>
            <input
              autoFocus value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESTORE"
              className="w-full bg-ink-800 border border-white/10 rounded-lg px-3 py-2 mb-3 outline-none focus:border-white/30"
            />
            <div className="flex gap-2">
              <button onClick={() => setConfirmRestore(false)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm">Cancel</button>
              <button onClick={doRestore} disabled={confirmText !== 'RESTORE'}
                className="flex-1 py-2 rounded-lg bg-warn text-ink-900 font-bold text-sm disabled:opacity-40">Restore</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
