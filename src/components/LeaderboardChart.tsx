import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid } from 'recharts'
import { startOfDay } from 'date-fns'
import type { GameState } from '../types'

interface Props {
  state: GameState
  days?: number
  height?: number
}

/** Points earned per day over the last `days`, Cam vs Arthur. */
export default function LeaderboardChart({ state, days = 7, height = 120 }: Props) {
  const today = startOfDay(new Date()).getTime()
  const DAY = 86_400_000
  const data = Array.from({ length: days }, (_, i) => {
    const dayStart = today - (days - 1 - i) * DAY
    const dayEnd = dayStart + DAY
    let cam = 0
    let arthur = 0
    for (const t of state.tasks) {
      if (t.status !== 'done' || t.completedAt == null) continue
      if (t.completedAt >= dayStart && t.completedAt < dayEnd) {
        if (t.owner === 'cam') cam += t.points
        else arthur += t.points
      }
    }
    return {
      label: new Date(dayStart).toLocaleDateString(undefined, { weekday: 'short' }),
      cam,
      arthur,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
        <defs>
          <linearGradient id="camG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="arthurG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF2BD6" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#FF2BD6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#ffffff10" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: '#10101e',
            border: '1px solid #ffffff20',
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: '#cbd5e1' }}
        />
        <Area type="monotone" dataKey="cam" name="Cam" stroke="#00E5FF" fill="url(#camG)" strokeWidth={2} />
        <Area
          type="monotone"
          dataKey="arthur"
          name="Arthur"
          stroke="#FF2BD6"
          fill="url(#arthurG)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
