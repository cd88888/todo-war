import { useEffect, useRef } from 'react'
import { POINTS_RUBRIC, rubricFor } from '../types'

interface Props {
  value: number
  accent: string
  onPick: (points: number) => void
  onClose: () => void
}

/** Compact 1–10 popover with the shared rubric, so scoring stays consistent. */
export default function PointsPicker({ value, accent, onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-50 right-0 top-full mt-1 w-60 panel rounded-xl p-2 shadow-card animate-rise"
      style={{ borderColor: accent + '55' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[10px] uppercase tracking-wider text-slate-500 px-1 pb-1.5">
        Difficulty — shared rubric
      </div>
      <div className="grid grid-cols-2 gap-1">
        {POINTS_RUBRIC.map((r) => {
          const active = value === r.value
          return (
            <button
              key={r.value}
              onClick={() => { onPick(r.value); onClose() }}
              className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-left transition hover:bg-white/10"
              style={active ? { background: accent + '22', boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
            >
              <span
                className="font-display font-bold text-sm w-5 text-center shrink-0"
                style={{ color: active ? accent : '#cbd5e1' }}
              >
                {r.value}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold leading-tight truncate">{r.label}</span>
                <span className="block text-[9px] text-slate-500 leading-tight truncate">{r.blurb}</span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="text-[9px] text-slate-600 px-1 pt-1.5">
        Currently: {value} · {rubricFor(value).label}
      </div>
    </div>
  )
}
