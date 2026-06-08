import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import clsx from 'clsx'
import { useGame } from '../contexts/GameContext'
import { useAIKeys } from '../contexts/AIKeysContext'
import { useMediaRecorder } from '../hooks/useMediaRecorder'
import { transcribeAudio, parseVoiceIntent, type VoiceAction } from '../services/voice'
import { PLAYERS } from '../types'

type Phase = 'idle' | 'recording' | 'transcribing' | 'parsing' | 'done' | 'error'

interface Props {
  /** When true, renders as a large floating button (dashboard). Otherwise inline FAB-style. */
  large?: boolean
}

const RESULT_TTL = 4000 // ms to show result before fading

export default function VoiceButton({ large = false }: Props) {
  const { state, currentPlayer, addTask, completeTask, reopenTask } = useGame()
  const { openAIKey, anthropicKey, hasKeys } = useAIKeys()
  const recorder = useMediaRecorder()
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<VoiceAction | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string>('')
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function resetAfter(ms = RESULT_TTL) {
    if (fadeTimer.current) clearTimeout(fadeTimer.current)
    fadeTimer.current = setTimeout(() => {
      setPhase('idle')
      setResult(null)
      setTranscript('')
      setErrorMsg(null)
    }, ms)
  }

  // Once we have an audio blob, run Whisper → Claude
  useEffect(() => {
    if (!recorder.audioBlob || phase !== 'recording') return

    let cancelled = false
    async function run() {
      setPhase('transcribing')
      try {
        const text = await transcribeAudio(recorder.audioBlob!, recorder.mimeType, openAIKey)
        setTranscript(text)
        if (cancelled) return
        setPhase('parsing')
        const action = await parseVoiceIntent(text, state, currentPlayer, anthropicKey)
        if (cancelled) return
        applyAction(action)
        setResult(action)
        setPhase('done')
        resetAfter()
      } catch (e) {
        if (cancelled) return
        setErrorMsg(e instanceof Error ? e.message : String(e))
        setPhase('error')
        resetAfter(6000)
      }
    }
    void run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.audioBlob])

  function applyAction(action: VoiceAction) {
    if (action.type === 'complete') completeTask(action.taskId)
    else if (action.type === 'reopen') reopenTask(action.taskId)
    else if (action.type === 'add') addTask({
      owner: action.owner,
      title: action.title,
      category: action.category,
      points: action.points,
    })
  }

  function handlePress() {
    if (phase !== 'idle') return
    if (!hasKeys) {
      setErrorMsg('Add VITE_OPENAI_API_KEY and VITE_ANTHROPIC_API_KEY to .env.local')
      setPhase('error')
      resetAfter(6000)
      return
    }
    void recorder.start()
    setPhase('recording')
  }

  function handleRelease() {
    if (phase !== 'recording') return
    recorder.stop()
    // phase switches to 'transcribing' via the effect above
  }

  const isRecording = phase === 'recording'
  const isBusy = phase === 'transcribing' || phase === 'parsing'
  const isDone = phase === 'done'
  const isError = phase === 'error'

  // Readable result line
  function resultLine() {
    if (!result) return null
    if (result.type === 'complete') return `✅ Completed "${result.taskTitle}"`
    if (result.type === 'reopen') return `↩️ Re-opened "${result.taskTitle}"`
    if (result.type === 'add') {
      const who = PLAYERS[result.owner]
      return `➕ Added "${result.title}" (${result.points}pt) for ${who.name}`
    }
    return `❓ Didn't catch that. Try again.`
  }

  const btn = (
    <button
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onTouchStart={(e) => { e.preventDefault(); handlePress() }}
      onTouchEnd={(e) => { e.preventDefault(); handleRelease() }}
      disabled={isBusy}
      title="Hold to speak a command"
      className={clsx(
        'relative flex items-center justify-center rounded-2xl transition-all select-none',
        large ? 'w-20 h-20' : 'w-14 h-14',
        isRecording && 'scale-110',
        isBusy && 'opacity-70 cursor-wait',
        isDone && 'scale-100',
        isError && 'scale-100',
      )}
      style={{
        background: isRecording
          ? 'radial-gradient(circle, #ff4444, #cc0000)'
          : isDone
          ? 'radial-gradient(circle, #39FF14aa, #20cc00aa)'
          : isError
          ? 'radial-gradient(circle, #ff8800aa, #cc6600aa)'
          : 'radial-gradient(circle, #1e2038, #10101e)',
        boxShadow: isRecording
          ? '0 0 30px rgba(255,50,50,0.8), 0 0 60px rgba(255,0,0,0.4)'
          : isDone
          ? '0 0 20px rgba(57,255,20,0.7)'
          : '0 0 0 1px rgba(255,255,255,0.1)',
      }}
    >
      {isBusy ? (
        <Loader2 className="animate-spin text-white" size={large ? 32 : 22} />
      ) : isDone ? (
        <CheckCircle2 className="text-win" size={large ? 32 : 22} />
      ) : isError ? (
        <AlertCircle className="text-warn" size={large ? 32 : 22} />
      ) : isRecording ? (
        <MicOff className="text-white" size={large ? 32 : 22} />
      ) : (
        <Mic className="text-slate-300" size={large ? 32 : 22} />
      )}

      {/* Recording pulse ring */}
      {isRecording && (
        <span
          className="absolute inset-0 rounded-2xl animate-ping"
          style={{ background: 'rgba(255,50,50,0.35)' }}
        />
      )}

      {/* Timer badge */}
      {isRecording && recorder.elapsedSeconds > 0 && (
        <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {recorder.elapsedSeconds}
        </span>
      )}
    </button>
  )

  if (large) {
    // Dashboard: button + status displayed inline, horizontally
    return (
      <div className="flex items-center gap-4">
        {btn}
        <div className="flex flex-col min-w-0">
          {isRecording && (
            <span className="font-display text-sm text-red-400 animate-pulse">
              Listening… release to process
            </span>
          )}
          {isBusy && (
            <span className="font-display text-sm text-slate-400">
              {phase === 'transcribing' ? 'Transcribing…' : 'Parsing command…'}
            </span>
          )}
          {isDone && result && (
            <span className="text-sm text-win animate-rise">{resultLine()}</span>
          )}
          {isError && (
            <span className="text-sm text-warn">{errorMsg?.slice(0, 80)}</span>
          )}
          {(isRecording || isBusy || isDone || isError) && transcript && (
            <span className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">&quot;{transcript}&quot;</span>
          )}
          {phase === 'idle' && (
            <span className="text-xs text-slate-500 font-display tracking-widest">
              HOLD TO SPEAK
            </span>
          )}
        </div>
      </div>
    )
  }

  // Phone: floating, with a dismissible toast
  return (
    <>
      {btn}
      {(isDone || isError) && (
        <div
          className={clsx(
            'fixed bottom-24 left-4 right-4 z-50 rounded-xl px-4 py-3 flex items-start gap-3 animate-rise',
            isDone ? 'bg-ink-700 border border-win/30' : 'bg-ink-700 border border-warn/30',
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{resultLine()}</div>
            {transcript && (
              <div className="text-xs text-slate-500 mt-0.5 truncate">&quot;{transcript}&quot;</div>
            )}
            {isError && errorMsg && <div className="text-xs text-warn mt-0.5">{errorMsg.slice(0, 120)}</div>}
          </div>
          <button
            onClick={() => { setPhase('idle'); setResult(null); setTranscript(''); setErrorMsg(null) }}
            className="text-slate-500 hover:text-slate-300 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {isRecording && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-red-900/80 backdrop-blur px-4 py-2 rounded-full font-display text-red-300 text-sm animate-pulse">
          Listening… release when done
        </div>
      )}
      {isBusy && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-ink-700/90 backdrop-blur px-4 py-2 rounded-full text-slate-300 text-sm">
          {phase === 'transcribing' ? '🎙 Transcribing…' : '🤖 Parsing…'}
        </div>
      )}
    </>
  )
}
