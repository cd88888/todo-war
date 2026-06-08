import { useEffect } from 'react'
import { GameProvider, useGame } from './contexts/GameContext'
import { AIKeysProvider } from './contexts/AIKeysContext'
import { useIsDashboard } from './hooks/useIsDashboard'
import { buildSeedState } from './services/seed'
import PlayerApp from './components/PlayerApp'
import Dashboard from './components/dashboard/Dashboard'

const SEED_FLAG = 'todoWar_seeded_v1'

function Root() {
  const isDashboard = useIsDashboard()
  const { state, replaceAll } = useGame()

  // First-run: import the whiteboard (user opted in). Guard with a flag so a
  // deliberately-emptied game doesn't get re-seeded.
  useEffect(() => {
    if (localStorage.getItem(SEED_FLAG)) return
    if (state.tasks.length === 0) replaceAll(buildSeedState())
    localStorage.setItem(SEED_FLAG, '1')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return isDashboard ? <Dashboard /> : <PlayerApp />
}

export default function App() {
  return (
    <AIKeysProvider>
      <GameProvider>
        <Root />
      </GameProvider>
    </AIKeysProvider>
  )
}
