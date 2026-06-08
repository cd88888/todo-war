import { createContext, useContext, type ReactNode } from 'react'

interface AIKeysContextValue {
  openAIKey: string
  anthropicKey: string
  hasKeys: boolean
}

const AIKeysContext = createContext<AIKeysContextValue>({
  openAIKey: '',
  anthropicKey: '',
  hasKeys: false,
})

export function AIKeysProvider({ children }: { children: ReactNode }) {
  const openAIKey = (import.meta.env.VITE_OPENAI_API_KEY as string) ?? ''
  const anthropicKey = (import.meta.env.VITE_ANTHROPIC_API_KEY as string) ?? ''
  // Only Anthropic key required now — OpenAI/Whisper handled by WhisperFlow system-wide.
  const hasKeys = anthropicKey.length > 0
  return (
    <AIKeysContext.Provider value={{ openAIKey, anthropicKey, hasKeys }}>
      {children}
    </AIKeysContext.Provider>
  )
}

export function useAIKeys() {
  return useContext(AIKeysContext)
}
