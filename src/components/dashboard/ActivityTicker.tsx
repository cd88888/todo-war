import { CheckCircle2, Crown, Zap, Plus, RotateCcw } from 'lucide-react'
import type { GameEvent } from '../../types'
import { PLAYERS } from '../../types'

function iconFor(type: GameEvent['type']) {
  switch (type) {
    case 'completed':
      return CheckCircle2
    case 'lead_change':
      return Crown
    case 'milestone':
      return Zap
    case 'reopened':
      return RotateCcw
    default:
      return Plus
  }
}

export default function ActivityTicker({ events }: { events: GameEvent[] }) {
  const recent = events.filter((e) => e.type !== 'deleted').slice(-18).reverse()

  if (recent.length === 0) {
    return (
      <div className="panel rounded-2xl px-5 py-3 text-slate-500 font-display tracking-widest text-sm">
        AWAITING FIRST BLOOD…
      </div>
    )
  }

  const Item = ({ e }: { e: GameEvent }) => {
    const Icon = iconFor(e.type)
    const p = PLAYERS[e.playerId]
    return (
      <span className="inline-flex items-center gap-2 px-5 whitespace-nowrap">
        <Icon size={16} style={{ color: p.color }} />
        <span style={{ color: p.color, fontWeight: 700 }}>{p.name}</span>
        <span className="text-slate-300">{e.message.replace(/^[A-Za-z]+ /, '')}</span>
        <span className="text-slate-600">·</span>
      </span>
    )
  }

  return (
    <div className="panel rounded-2xl overflow-hidden">
      <div className="flex items-center">
        <div className="shrink-0 px-4 py-3 font-display tracking-widest text-xs text-win bg-win/10 border-r border-white/10">
          LIVE
        </div>
        <div className="relative flex-1 overflow-hidden py-3">
          <div className="flex animate-ticker w-max">
            {[...recent, ...recent].map((e, i) => (
              <Item key={e.id + '-' + i} e={e} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
