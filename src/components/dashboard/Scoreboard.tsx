import { Crown } from 'lucide-react'
import clsx from 'clsx'
import type { Board, Period } from '../../types'
import { PERIODS, PLAYERS } from '../../types'

interface Props {
  board: Board
  period: Period
}

export default function Scoreboard({ board, period }: Props) {
  const label = PERIODS.find((p) => p.key === period)?.label ?? ''

  const Column = ({ who }: { who: 'cam' | 'arthur' }) => {
    const p = PLAYERS[who]
    const score = who === 'cam' ? board.cam : board.arthur
    const count = who === 'cam' ? board.camCount : board.arthurCount
    const leads = board.leader === who
    const losing = board.leader !== null && !leads
    return (
      <div
        className={clsx(
          'relative flex-1 flex flex-col items-center justify-center py-8 px-4 rounded-3xl transition-all duration-500',
          losing && 'opacity-60',
        )}
        style={{
          background: `radial-gradient(circle at 50% 0%, ${p.color}22, transparent 70%)`,
          boxShadow: leads ? `inset 0 0 0 2px ${p.color}, 0 0 50px ${p.color}55` : `inset 0 0 0 1px ${p.color}33`,
        }}
      >
        {leads && (
          <Crown
            className="absolute -top-5 text-win animate-crown-bob"
            size={48}
            style={{ filter: 'drop-shadow(0 0 10px rgba(57,255,20,0.7))' }}
          />
        )}
        <div className="text-6xl mb-2">{p.emoji}</div>
        <div
          className={who === 'cam' ? 'neon-text-cam' : 'neon-text-arthur'}
          style={{ fontWeight: 900, fontSize: '2rem', letterSpacing: '0.05em' }}
        >
          {p.name.toUpperCase()}
        </div>
        <div
          className={clsx('font-display font-black tabular-nums leading-none my-2', leads && 'animate-pulse-glow')}
          style={{ color: p.color, fontSize: 'clamp(4rem, 14vw, 11rem)', textShadow: `0 0 30px ${p.color}99` }}
        >
          {score}
        </div>
        <div className="text-slate-400 font-display tracking-widest text-sm">{count} DONE</div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="text-center mb-4">
        <span className="font-display tracking-[0.3em] text-slate-400 text-lg">{label.toUpperCase()}</span>
      </div>
      <div className="flex items-stretch gap-4">
        <Column who="cam" />
        <div className="flex flex-col items-center justify-center">
          <span className="font-display font-black text-4xl text-slate-600">VS</span>
        </div>
        <Column who="arthur" />
      </div>
      <div className="text-center mt-5 h-8">
        {board.leader === null ? (
          <span className="font-display tracking-widest text-slate-400 text-xl">DEAD HEAT</span>
        ) : (
          <span
            className="font-display font-bold tracking-widest text-2xl neon-text-win"
          >
            {PLAYERS[board.leader].name.toUpperCase()} LEADS BY {board.margin}
          </span>
        )}
      </div>
    </div>
  )
}
