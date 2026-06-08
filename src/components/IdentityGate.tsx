import { Swords, Monitor } from 'lucide-react'
import { PLAYER_IDS, PLAYERS } from '../types'
import { useGame } from '../contexts/GameContext'

export default function IdentityGate() {
  const { setCurrentPlayer } = useGame()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="flex items-center gap-3 mb-2">
        <Swords className="text-cam" size={34} />
        <h1 className="text-4xl sm:text-5xl font-display font-black">
          <span className="neon-text-cam">TODO</span> <span className="neon-text-arthur">WAR</span>
        </h1>
        <Swords className="text-arthur scale-x-[-1]" size={34} />
      </div>
      <p className="text-slate-400 mb-10 font-display tracking-widest text-xs">
        CAM &nbsp;VS&nbsp; ARTHUR · MAY THE GRIND WIN
      </p>

      <p className="text-slate-300 mb-5">Who are you?</p>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {PLAYER_IDS.map((id) => {
          const p = PLAYERS[id]
          const isCam = id === 'cam'
          return (
            <button
              key={id}
              onClick={() => setCurrentPlayer(id)}
              className={[
                'panel scanlines relative py-8 rounded-2xl transition-transform hover:scale-[1.03] active:scale-95',
                isCam ? 'hover:shadow-neon-cam' : 'hover:shadow-neon-arthur',
              ].join(' ')}
              style={{ borderColor: p.color + '55' }}
            >
              <div className="text-5xl mb-2">{p.emoji}</div>
              <div
                className={isCam ? 'neon-text-cam' : 'neon-text-arthur'}
                style={{ fontWeight: 800 }}
              >
                I'm {p.name}
              </div>
            </button>
          )
        })}
      </div>

      <a
        href="?view=dashboard"
        className="mt-10 inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm"
      >
        <Monitor size={16} /> Open the apartment monitor dashboard
      </a>
    </div>
  )
}
