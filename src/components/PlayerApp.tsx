import { useEffect, useMemo, useState } from 'react'
import { Plus, Bell, BellOff, Monitor, LogOut, Swords, BarChart3, ListPlus, Target } from 'lucide-react'
import clsx from 'clsx'
import { useGame } from '../contexts/GameContext'
import { useNotifications } from '../hooks/useNotifications'
import { getPermission, requestPermission } from '../services/notifications'
import { PLAYERS, opponentOf, type Period } from '../types'
import IdentityGate from './IdentityGate'
import LeaderboardTabs from './LeaderboardTabs'
import VersusBar from './VersusBar'
import LeaderboardChart from './LeaderboardChart'
import TaskList from './TaskList'
import TaskModal from './TaskModal'
import BulkAddModal from './BulkAddModal'
import Analytics from './Analytics'

const NOTIF_KEY = 'todoWar_notif_v1'

export default function PlayerApp() {
  const { state, boards, currentPlayer, setCurrentPlayer } = useGame()
  const [period, setPeriod] = useState<Period>('week')
  const [side, setSide] = useState<'me' | 'rival'>('me')
  const [modal, setModal] = useState<null | 'new' | 'goal'>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [notifOn, setNotifOn] = useState(() => localStorage.getItem(NOTIF_KEY) === '1')

  useNotifications(notifOn)

  useEffect(() => {
    if (notifOn && getPermission() === 'denied') setNotifOn(false)
  }, [notifOn])

  const me = currentPlayer
  const board = boards[period]

  const myTasks = useMemo(() => state.tasks.filter((t) => t.owner === me), [state.tasks, me])
  const rivalTasks = useMemo(
    () => (me ? state.tasks.filter((t) => t.owner === opponentOf(me)) : []),
    [state.tasks, me],
  )

  if (!me) return <IdentityGate />

  const rival = opponentOf(me)
  const accent = PLAYERS[me].color

  async function toggleNotifs() {
    if (notifOn) { setNotifOn(false); localStorage.setItem(NOTIF_KEY, '0'); return }
    const perm = getPermission() === 'granted' ? 'granted' : await requestPermission()
    if (perm === 'granted') { setNotifOn(true); localStorage.setItem(NOTIF_KEY, '1') }
  }

  const showing = side === 'me' ? myTasks : rivalTasks

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 pb-28">
      {/* Header */}
      <header className="flex items-center justify-between py-4 sticky top-0 z-30 bg-ink-900/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <Swords className="text-cam" size={20} />
          <span className="font-display font-black tracking-wide">
            <span className="neon-text-cam">TODO</span> <span className="neon-text-arthur">WAR</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setAnalyticsOpen(true)} title="Stats & history"
            className="p-2 rounded-lg hover:bg-white/10 text-slate-300">
            <BarChart3 size={18} />
          </button>
          <button onClick={toggleNotifs} title={notifOn ? 'Mute alerts' : 'Enable phone alerts'}
            className={clsx('p-2 rounded-lg hover:bg-white/10', notifOn ? 'text-win' : 'text-slate-400')}>
            {notifOn ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
          <a href="?view=dashboard" title="Monitor dashboard" className="p-2 rounded-lg hover:bg-white/10 text-slate-300">
            <Monitor size={18} />
          </a>
          <button onClick={() => setCurrentPlayer(null)} title="Switch player"
            className="ml-1 inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
            style={{ boxShadow: `inset 0 0 0 1px ${accent}55` }}>
            <span>{PLAYERS[me].emoji}</span>
            <span className="text-sm font-semibold" style={{ color: accent }}>{PLAYERS[me].name}</span>
            <LogOut size={13} className="text-slate-500" />
          </button>
        </div>
      </header>

      {/* Scoreboard */}
      <section className="panel scanlines relative rounded-2xl p-4 mb-3">
        <LeaderboardTabs value={period} onChange={setPeriod} />
        <div className="mt-4">
          <VersusBar board={board} size="lg" />
        </div>
        <div className="mt-2 text-center text-xs text-slate-400">
          {board.leader === null ? (
            <span>Dead heat {board.cam} – {board.arthur}. First to check off wins.</span>
          ) : board.leader === me ? (
            <span className="neon-text-win">🏆 You're up by {board.margin}. Don't get comfortable.</span>
          ) : (
            <span className="neon-text-arthur">{PLAYERS[rival].name} leads by {board.margin}. Get to work.</span>
          )}
        </div>
        <div className="mt-3 -mx-1">
          <LeaderboardChart state={state} />
        </div>
      </section>

      {/* Side switcher */}
      <div className="flex gap-1 p-1 bg-ink-800 rounded-xl mb-3">
        {(['me', 'rival'] as const).map((s) => {
          const who = s === 'me' ? me : rival
          const active = side === s
          return (
            <button key={s} onClick={() => setSide(s)}
              className={clsx('flex-1 py-2 rounded-lg text-sm font-semibold transition',
                active ? 'bg-white/10' : 'text-slate-400 hover:text-slate-200')}
              style={active ? { color: PLAYERS[who].color } : undefined}>
              {PLAYERS[who].emoji} {s === 'me' ? 'My Board' : `${PLAYERS[who].name}'s Board`}
            </button>
          )
        })}
      </div>

      <TaskList tasks={showing} owner={side === 'me' ? me : rival} editable={side === 'me'} />

      {/* Action buttons (only on my side) */}
      {side === 'me' && (
        <div className="fixed bottom-5 right-4 z-30 flex items-center gap-2">
          <button onClick={() => setModal('goal')} title="New goal"
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-ink-700 hover:bg-ink-600 text-gold border border-gold/40 active:scale-95 transition">
            <Target size={18} />
          </button>
          <button onClick={() => setBulkOpen(true)} title="Bulk add"
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-ink-700 hover:bg-ink-600 text-slate-200 active:scale-95 transition">
            <ListPlus size={18} />
          </button>
          <button onClick={() => setModal('new')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-display font-bold text-sm text-ink-900 active:scale-95 transition"
            style={{ background: accent, boxShadow: `0 0 20px ${accent}99` }}>
            <Plus size={18} strokeWidth={3} /> Add task
          </button>
        </div>
      )}

      {modal && (
        <TaskModal owner={me} defaultGoal={modal === 'goal'} onClose={() => setModal(null)} />
      )}
      {bulkOpen && <BulkAddModal owner={me} onClose={() => setBulkOpen(false)} />}
      {analyticsOpen && <Analytics onClose={() => setAnalyticsOpen(false)} />}
    </div>
  )
}
