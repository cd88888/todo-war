import { useCallback, useEffect, useRef, useState } from 'react'
import { PERIODS, type Period } from '../../types'

const AUTO_INTERVAL = 8000 // ms between auto-advances
const RESUME_AFTER = 15000 // ms after manual tap before auto resumes

interface RotatorState {
  period: Period
  index: number
  paused: boolean
}

interface RotatorControls extends RotatorState {
  pick: (index: number) => void
}

/** Auto-cycles through leaderboard periods. Manual tap pauses, resumes after RESUME_AFTER ms. */
export function useRotatingPeriod(): RotatorControls {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    if (autoTimer.current) clearInterval(autoTimer.current)
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
  }, [])

  const startAuto = useCallback(() => {
    clearTimers()
    autoTimer.current = setInterval(
      () => setIndex((i) => (i + 1) % PERIODS.length),
      AUTO_INTERVAL,
    )
  }, [clearTimers])

  // Boot auto-cycle
  useEffect(() => {
    startAuto()
    return clearTimers
  }, [startAuto, clearTimers])

  const pick = useCallback(
    (i: number) => {
      setIndex(i)
      setPaused(true)
      clearTimers()
      // Resume auto after RESUME_AFTER ms of inactivity
      resumeTimer.current = setTimeout(() => {
        setPaused(false)
        startAuto()
      }, RESUME_AFTER)
    },
    [clearTimers, startAuto],
  )

  return { period: PERIODS[index].key, index, paused, pick }
}

interface PipsProps {
  index: number
  paused: boolean
  onPick: (i: number) => void
}

export function PeriodPips({ index, paused, onPick }: PipsProps) {
  return (
    <div className="flex items-center gap-2">
      {PERIODS.map((p, i) => {
        const active = i === index
        return (
          <button
            key={p.key}
            onClick={() => onPick(i)}
            title={p.label}
            className="group flex flex-col items-center gap-1 focus:outline-none"
          >
            <span
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: active ? 28 : 10,
                background: active
                  ? paused
                    ? '#FFB800' // amber when paused (manually selected)
                    : '#e7e9ff'
                  : '#ffffff33',
              }}
            />
            <span
              className={[
                'text-[9px] font-display tracking-widest uppercase transition-opacity',
                active ? 'opacity-80' : 'opacity-0 group-hover:opacity-40',
              ].join(' ')}
              style={{ color: paused && active ? '#FFB800' : '#e7e9ff' }}
            >
              {p.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
