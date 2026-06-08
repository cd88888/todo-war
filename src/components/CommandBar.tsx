import { useRef, useState } from 'react'
import { Send, Loader2, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { useGame } from '../contexts/GameContext'
import { useAIKeys } from '../contexts/AIKeysContext'
import { parseVoiceIntent, type VoiceAction } from '../services/voice'
import { PLAYERS } from '../types'

type Phase = 'idle' | 'parsing' | 'done' | 'error'

interface Props {
  /** Dashboard mode: always visible, full-width, no toggle needed. */
  dashboard?: boolean
}

export default function CommandBar({ dashboard = false }: Props) {
  const { state, currentPlayer, addTask, completeTask, reopenTask } = useGame()
  const { anthropicKey, hasKeys } = useAIKeys()
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<VoiceAction | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit() {
    const trimmed = text.trim()
    if (!trimmed || phase === 'parsing') return

    if (!hasKeys) {
      setErrorMsg('Add VITE_ANTHROPIC_API_KEY to .env.local to enable command parsing.')
      setPhase('error')
      return
    }

    setPhase('parsing')
    setResult(null)
    setErrorMsg('')

    try {
      const action = await parseVoiceIntent(trimmed, state, currentPlayer, anthropicKey)
      applyAction(action)
      setResult(action)
      setPhase('done')
      setText('')
      // Auto-clear result after 5s
      setTimeout(() => setPhase('idle'), 5000)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message.slice(0, 120) : String(e))
      setPhase('error')
    }
  }

  function applyAction(action: VoiceAction) {
    if (action.type === 'complete') completeTask(action.taskId)
    else if (action.type === 'reopen') reopenTask(action.taskId)
    else if (action.type === 'add')
      addTask({ owner: action.owner, title: action.title, category: action.category, points: action.points })
  }

  function resultLine(action: VoiceAction) {
    if (action.type === 'complete') return `✅ Completed "${action.taskTitle}"`
    if (action.type === 'reopen') return `↩️ Re-opened "${action.taskTitle}"`
    if (action.type === 'add') {
      const who = PLAYERS[action.owner]
      return `➕ Added "${action.title}" (${action.points}pt) for ${who.name}`
    }
    return `❓ Didn't catch that — try being more specific.`
  }

  const accentColor = dashboard ? '#e7e9ff' : (currentPlayer === 'arthur' ? '#FF2BD6' : '#00E5FF')

  return (
    <div className={clsx('flex flex-col gap-1.5', dashboard ? 'w-full max-w-md' : 'w-full')}>
      {/* Input row */}
      <div
        className="flex items-center gap-2 bg-ink-700/80 border rounded-xl px-3 py-2 focus-within:border-white/30 transition"
        style={{ borderColor: phase === 'parsing' ? accentColor + '88' : 'rgba(255,255,255,0.08)' }}
      >
        <Sparkles
          size={16}
          className={clsx('shrink-0 transition', phase === 'parsing' ? 'animate-pulse' : 'text-slate-500')}
          style={{ color: phase === 'parsing' ? accentColor : undefined }}
        />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); setPhase('idle'); setResult(null); setErrorMsg('') }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={dashboard ? 'Type or dictate a command…' : 'What did you get done?'}
          disabled={phase === 'parsing'}
          className={clsx(
            'flex-1 bg-transparent outline-none text-sm placeholder:text-slate-600 min-w-0',
            dashboard && 'font-display tracking-wide text-base',
          )}
        />
        {text && phase !== 'parsing' && (
          <button
            onClick={() => { setText(''); setPhase('idle'); setResult(null); setErrorMsg(''); inputRef.current?.focus() }}
            className="text-slate-600 hover:text-slate-400 shrink-0"
          >
            <X size={14} />
          </button>
        )}
        <button
          onClick={submit}
          disabled={!text.trim() || phase === 'parsing'}
          className="shrink-0 text-slate-400 hover:text-white disabled:opacity-30 transition"
        >
          {phase === 'parsing'
            ? <Loader2 size={16} className="animate-spin" />
            : <Send size={16} />}
        </button>
      </div>

      {/* Feedback */}
      {phase === 'done' && result && (
        <div className="flex items-center gap-2 px-1 text-sm animate-rise">
          <CheckCircle2 size={14} className="text-win shrink-0" />
          <span className="text-slate-200">{resultLine(result)}</span>
        </div>
      )}
      {phase === 'error' && (
        <div className="flex items-center gap-2 px-1 text-sm animate-rise">
          <AlertCircle size={14} className="text-warn shrink-0" />
          <span className="text-warn">{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
