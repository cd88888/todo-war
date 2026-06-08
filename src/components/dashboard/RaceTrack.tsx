import { Flag } from 'lucide-react'
import type { Board } from '../../types'
import { PLAYERS } from '../../types'

interface Props {
  board: Board
}

/** Two neon lanes racing toward a finish line, length ∝ points. */
export default function RaceTrack({ board }: Props) {
  const max = Math.max(board.cam, board.arthur, 1)
  // Leave 12% headroom so the leader isn't pinned to the flag.
  const pct = (v: number) => 8 + (v / max) * 80

  const Lane = ({ who }: { who: 'cam' | 'arthur' }) => {
    const p = PLAYERS[who]
    const v = who === 'cam' ? board.cam : board.arthur
    const leads = board.leader === who
    return (
      <div className="relative h-16">
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-ink-800/80 border border-white/5" />
        <div
          className="absolute inset-y-1 left-1 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `calc(${pct(v)}% - 8px)`,
            background:
              who === 'cam'
                ? 'linear-gradient(90deg,#0091a8,#00E5FF)'
                : 'linear-gradient(90deg,#a8138c,#FF2BD6)',
            boxShadow: `0 0 18px ${p.color}aa`,
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out text-3xl"
          style={{ left: `calc(${pct(v)}% - 14px)`, filter: leads ? 'drop-shadow(0 0 8px #39FF14)' : 'none' }}
        >
          {p.emoji}
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 left-3 font-display font-bold text-ink-900/90 text-sm">
          {p.name.toUpperCase()}
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-4 font-display font-black" style={{ color: p.color }}>
          {v}
        </div>
      </div>
    )
  }

  return (
    <div className="relative panel rounded-2xl p-4">
      <div className="absolute right-5 top-2 bottom-2 flex items-center text-slate-600">
        <Flag size={20} />
      </div>
      <div className="space-y-3 pr-6">
        <Lane who="cam" />
        <Lane who="arthur" />
      </div>
    </div>
  )
}
