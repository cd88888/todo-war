import { createContext, useContext, type ReactNode } from 'react'

// No API keys needed — command bar uses local pattern matching (free, offline, instant).
// Supabase keys are handled via env vars in the sync factory, not here.

interface AIKeysContextValue {
  hasKeys: boolean
}

const AIKeysContext = createContext<AIKeysContextValue>({ hasKeys: true })

export function AIKeysProvider({ children }: { children: ReactNode }) {
  return (
    <AIKeysContext.Provider value={{ hasKeys: true }}>
      {children}
    </AIKeysContext.Provider>
  )
}

export function useAIKeys() {
  return useContext(AIKeysContext)
}
