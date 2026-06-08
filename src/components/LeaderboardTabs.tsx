import clsx from 'clsx'
import { PERIODS, type Period } from '../types'

interface Props {
  value: Period
  onChange: (p: Period) => void
}

export default function LeaderboardTabs({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 bg-ink-800 rounded-xl overflow-x-auto scrollbar-thin">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={clsx(
            'flex-1 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition',
            value === p.key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
