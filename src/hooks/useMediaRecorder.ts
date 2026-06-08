import { useCallback, useRef, useState } from 'react'

type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error'

interface UseMediaRecorderResult {
  state: RecorderState
  mimeType: string
  audioBlob: Blob | null
  elapsedSeconds: number
  start: () => Promise<void>
  stop: () => void
  reset: () => void
  error: string | null
}

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export function useMediaRecorder(): UseMediaRecorderResult {
  const [state, setState] = useState<RecorderState>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)

  const start = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    chunksRef.current = []
    setElapsedSeconds(0)
    setState('requesting')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone access denied. Please allow microphone access and try again.')
      setState('error')
      return
    }

    streamRef.current = stream
    const type = getSupportedMimeType()
    setMimeType(type)

    const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || type })
      setAudioBlob(blob)
      stream.getTracks().forEach(t => t.stop())
    }

    recorder.start(250)
    setState('recording')

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds(s => s + 1)
    }, 1000)
  }, [])

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    recorderRef.current?.stop()
    setState('stopped')
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setAudioBlob(null)
    setElapsedSeconds(0)
    setError(null)
    setMimeType('')
    chunksRef.current = []
    setState('idle')
  }, [])

  return { state, mimeType, audioBlob, elapsedSeconds, start, stop, reset, error }
}
