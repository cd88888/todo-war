import { useEffect, useState } from 'react'
import { Swords, Target, Flame } from 'lucide-react'
import { useGame } from '../../contexts/GameContext'
import { useNotifications } from '../../hooks/useNotifications'
import { PLAYERS, GOAL_COLOR, type PlayerId, type Task } from '../../types'
import Scoreboard from './Scoreboard'
import RaceTrack from './RaceTrack'
import ActivityTicker from './ActivityTicker'
import { useRotatingPeriod, PeriodPips } from './PeriodRotator'
import LeaderboardChart from '../LeaderboardChart'
import CommandBar from '../CommandBar'

const byOrder = (a: Task, b: Task) => (a.order ?? 0) - (b.order ?? 0)

/** Glanceable "on deck" column for one player — top open tasks by urgency. */
function OnDeck({ player, tasks }: { player: PlayerId; tasks: Task[] }) {
  const c = PLAYERS[player]
  const goals = tasks.filter((t) => t.isGoal && t.status === 'open').sort(byOrder).slice(0, 2)
  const todos = tasks
    .filter((t) => !t.isGoal && !t.parentId && t.status === 'open')
    .sort(byOrder)
    .slice(0, 6)
  return (
    <div className="panel rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{c.emoji}</span>
        <span className="font-display font-bold tracking-wide" style={{ color: c.color }}>{c.name}</span>
        <span className="text-xs text-slate-500 ml-auto">on deck</span>
      </div>
      <div className="space-y-1.5">
        {goals.map((g) => (
          <div key={g.id} className="flex items-center gap-2 text-sm rounded-lg px-2 py-1.5"
            style={{ boxShadow: `inset 0 0 0 1px ${GOAL_COLOR}44`, background: `${GOAL_COLOR}10` }}>
            <Target size={13} style={{ color: GOAL_COLOR }} className="shrink-0" />
            <span className="flex-1 truncate">{g.title}</span>
            <span className="font-display font-bold text-xs" style={{ color: GOAL_COLOR }}>{g.points}</span>
          </div>
        ))}
        {todos.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-sm px-2 py-1" style={{ borderLeft: `2px solid ${c.color}` }}>
            <span className="flex-1 truncate text-slate-200">{t.title}</span>
            {t.recurrence && <Flame size={11} className="text-slate-600 shrink-0" />}
            <span className="font-display font-bold text-xs" style={{ color: c.color }}>{t.points}</span>
          </div>
        ))}
        {goals.length === 0 && todos.length === 0 && (
          <p className="text-slate-600 text-sm py-3 text-center">All clear. 🎯</p>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { state, boards } = useGame()
  const { period, index, paused, pick } = useRotatingPeriod()
  const [clock, setClock] = useState('')

  // The monitor is always on — surface all events as browser notifications.
  useNotifications(true)

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const board = boards[period]
  const allTime = boards.all
  const camTasks = state.tasks.filter((t) => t.owner === 'cam')
  const arthurTasks = state.tasks.filter((t) => t.owner === 'arthur')

  return (
    <div className="min-h-screen flex flex-col p-6 lg:p-10 gap-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Swords className="text-cam" size={30} />
          <h1 className="text-3xl lg:text-4xl font-display font-black">
            <span className="neon-text-cam">TODO</span>{' '}
            <span className="neon-text-arthur">WAR</span>
          </h1>
        </div>

        {/* Clickable period pips */}
        <PeriodPips index={index} paused={paused} onPick={pick} />

        <div className="flex items-center gap-6">
          {/* Command bar — type or WhisperFlow dictate */}
          <CommandBar dashboard />
          <div className="font-display text-2xl lg:text-3xl tabular-nums text-slate-300">
            {clock}
          </div>
        </div>
      </header>

      {/* Hero scoreboard (selected/rotating period) */}
      <section className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-5xl">
          <Scoreboard board={board} period={period} />
        </div>
      </section>

      {/* Chart + race side by side on wide screens */}
      <section className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7-day history chart */}
        <div className="panel rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-display tracking-widest text-slate-400 text-sm">
              7-DAY HISTORY
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-1 rounded-full bg-cam inline-block" /> Cam
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-1 rounded-full bg-arthur inline-block" /> Arthur
              </span>
            </div>
          </div>
          <LeaderboardChart state={state} days={7} height={160} />
        </div>

        {/* All-time race */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="font-display tracking-widest text-slate-400 text-sm">
              ALL-TIME RACE
            </span>
            <span className="font-display tracking-widest text-slate-600 text-xs">
              {allTime.cam} — {allTime.arthur}
            </span>
          </div>
          <RaceTrack board={allTime} />
        </div>
      </section>

      {/* On-deck task columns */}
      <section className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OnDeck player="cam" tasks={camTasks} />
        <OnDeck player="arthur" tasks={arthurTasks} />
      </section>

      {/* Live ticker */}
      <section className="max-w-6xl w-full mx-auto">
        <ActivityTicker events={state.events} />
      </section>
    </div>
  )
}
