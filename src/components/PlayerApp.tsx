import { useEffect, useMemo, useState } from 'react'
import { Plus, Bell, BellOff, Monitor, RefreshCw, LogOut, Swords } from 'lucide-react'
import clsx from 'clsx'
import { useGame } from '../contexts/GameContext'
import { useNotifications } from '../hooks/useNotifications'
import { getPermission, requestPermission } from '../services/notifications'
import { buildSeedState } from '../services/seed'
import { PLAYERS, opponentOf, type Period, type Task } from '../types'
import IdentityGate from './IdentityGate'
import LeaderboardTabs from './LeaderboardTabs'
import VersusBar from './VersusBar'
import LeaderboardChart from './LeaderboardChart'
import TaskList from './TaskList'
import TaskModal from './TaskModal'
import CommandBar from './CommandBar'

const NOTIF_KEY = 'todoWar_notif_v1'

export default function PlayerApp() {
  const { state, boards, currentPlayer, setCurrentPlayer, replaceAll } = useGame()
  const [period, setPeriod] = useState<Period>('week')
  const [side, setSide] = useState<'me' | 'rival'>('me')
  const [modalFor, setModalFor] = useState<Task | 'new' | null>(null)
  const [notifOn, setNotifOn] = useState(() => localStorage.getItem(NOTIF_KEY) === '1')

  useNotifications(notifOn)

  // Keep the mute flag honest if permission was revoked at the browser level.
  useEffect(() => {
    if (notifOn && getPermission() === 'denied') setNotifOn(false)
  }, [notifOn])

  const me = currentPlayer
  const board = boards[period]

  const myTasks = useMemo(
    () => state.tasks.filter((t) => t.owner === me),
    [state.tasks, me],
  )
  const rivalTasks = useMemo(
    () => (me ? state.tasks.filter((t) => t.owner === opponentOf(me)) : []),
    [state.tasks, me],
  )

  if (!me) return <IdentityGate />

  const rival = opponentOf(me)
  const accent = PLAYERS[me].color

  async function toggleNotifs() {
    if (notifOn) {
      setNotifOn(false)
      localStorage.setItem(NOTIF_KEY, '0')
      return
    }
    const perm = getPermission() === 'granted' ? 'granted' : await requestPermission()
    if (perm === 'granted') {
      setNotifOn(true)
      localStorage.setItem(NOTIF_KEY, '1')
    }
  }

  function hardReset() {
    if (confirm('Reset the whole game back to the whiteboard import?')) {
      replaceAll(buildSeedState())
    }
  }

  const showing = side === 'me' ? myTasks : rivalTasks

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 pb-40">
      {/* Header */}
      <header className="flex items-center justify-between py-4 sticky top-0 z-30 bg-ink-900/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <Swords className="text-cam" size={20} />
          <span className="font-display font-black tracking-wide">
            <span className="neon-text-cam">TODO</span> <span className="neon-text-arthur">WAR</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleNotifs}
            title={notifOn ? 'Mute alerts' : 'Enable phone alerts'}
            className={clsx(
              'p-2 rounded-lg hover:bg-white/10',
              notifOn ? 'text-win' : 'text-slate-400',
            )}
          >
            {notifOn ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
          <a href="?view=dashboard" title="Monitor dashboard" className="p-2 rounded-lg hover:bg-white/10 text-slate-300">
            <Monitor size={18} />
          </a>
          <button onClick={hardReset} title="Reset to whiteboard" className="p-2 rounded-lg hover:bg-white/10 text-slate-400">
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setCurrentPlayer(null)}
            title="Switch player"
            className="ml-1 inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
            style={{ boxShadow: `inset 0 0 0 1px ${accent}55` }}
          >
            <span>{PLAYERS[me].emoji}</span>
            <span className="text-sm font-semibold" style={{ color: accent }}>
              {PLAYERS[me].name}
            </span>
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
            <span>Dead heat. Break the tie.</span>
          ) : board.leader === me ? (
            <span className="neon-text-win">You're up by {board.margin}. Don't get comfortable.</span>
          ) : (
            <span className="neon-text-arthur">
              {PLAYERS[rival].name} leads by {board.margin}. Get to work.
            </span>
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
            <button
              key={s}
              onClick={() => setSide(s)}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-semibold transition',
                active ? 'bg-white/10' : 'text-slate-400 hover:text-slate-200',
              )}
              style={active ? { color: PLAYERS[who].color } : undefined}
            >
              {PLAYERS[who].emoji} {s === 'me' ? 'My War Room' : `${PLAYERS[who].name}'s Board`}
            </button>
          )
        })}
      </div>

      <TaskList
        tasks={showing}
        owner={side === 'me' ? me : rival}
        editable={side === 'me'}
        onEdit={(t) => setModalFor(t)}
      />

      {/* Command bar + add-task FAB */}
      {side === 'me' && (
        <>
          {/* Full-width command bar pinned to the bottom */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-ink-900/90 backdrop-blur border-t border-white/5 px-4 pt-3 pb-safe pb-5 max-w-2xl mx-auto">
            <CommandBar />
          </div>

          {/* Add task FAB above the command bar */}
          <button
            onClick={() => setModalFor('new')}
            className="fixed bottom-24 right-4 z-30 w-12 h-12 rounded-xl flex items-center justify-center text-ink-900 active:scale-95 transition"
            style={{ background: accent, boxShadow: `0 0 16px ${accent}aa` }}
            title="Add task"
          >
            <Plus size={22} strokeWidth={3} />
          </button>
        </>
      )}

      {modalFor && (
        <TaskModal
          owner={me}
          existing={modalFor === 'new' ? undefined : modalFor}
          onClose={() => setModalFor(null)}
        />
      )}
    </div>
  )
}
