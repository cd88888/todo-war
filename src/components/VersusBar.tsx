import { Crown } from 'lucide-react'
import clsx from 'clsx'
import type { Board } from '../types'
import { PLAYERS } from '../types'

interface Props {
  board: Board
  size?: 'sm' | 'lg'
}

/** Cam-vs-Arthur split bar with scores and a crown on the leader. */
export default function VersusBar({ board, size = 'sm' }: Props) {
  const total = board.cam + board.arthur
  const camPct = total === 0 ? 50 : (board.cam / total) * 100
  const big = size === 'lg'

  const Side = ({ who }: { who: 'cam' | 'arthur' }) => {
    const p = PLAYERS[who]
    const score = who === 'cam' ? board.cam : board.arthur
    const leads = board.leader === who
    return (
      <div className={clsx('flex items-center gap-2', who === 'arthur' && 'flex-row-reverse')}>
        <span className="text-xl">{p.emoji}</span>
        <span
          className={who === 'cam' ? 'neon-text-cam' : 'neon-text-arthur'}
          style={{ fontWeight: 800 }}
        >
          {p.name}
        </span>
        {leads && <Crown size={big ? 22 : 16} className="text-win animate-crown-bob" />}
        <span
          className={clsx('font-display tabular-nums', big ? 'text-4xl' : 'text-xl')}
          style={{ color: p.color }}
        >
          {score}
        </span>
      </div>
    )
  }

  return (
    <div>
      <div className={clsx('flex items-center justify-between', big ? 'mb-3' : 'mb-1.5')}>
        <Side who="cam" />
        <Side who="arthur" />
      </div>
      <div
        className={clsx('w-full rounded-full overflow-hidden flex bg-ink-800', big ? 'h-4' : 'h-2.5')}
      >
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${camPct}%`, background: 'linear-gradient(90deg,#0091a8,#00E5FF)' }}
        />
        <div
          className="h-full transition-all duration-700 ease-out flex-1"
          style={{ background: 'linear-gradient(90deg,#FF2BD6,#a8138c)' }}
        />
      </div>
    </div>
  )
}
