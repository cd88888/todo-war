import { useEffect, useRef } from 'react'
import { useGame } from '../contexts/GameContext'
import { fireForEvent, fireRecap, getPermission } from '../services/notifications'
import { losingLine } from '../services/trashTalk'
import { opponentOf } from '../types'

const RECAP_KEY = 'todoWar_lastRecap_v1'

/**
 * Watches the event stream and fires local notifications for opponent activity
 * (lead changes, milestones, completions) plus a once-a-day standings recap.
 * `enabled` lets the user mute without revoking browser permission.
 */
export function useNotifications(enabled: boolean) {
  const { state, boards, currentPlayer } = useGame()
  const seen = useRef<Set<string>>(new Set())
  const primed = useRef(false)

  // Prime: mark all existing events as already-seen so we don't alert on history.
  useEffect(() => {
    if (primed.current) return
    for (const e of state.events) seen.current.add(e.id)
    primed.current = true
  }, [state.events])

  // Fire on genuinely new events.
  useEffect(() => {
    if (!primed.current || !enabled) return
    for (const e of state.events) {
      if (seen.current.has(e.id)) continue
      seen.current.add(e.id)
      if (getPermission() === 'granted') fireForEvent(e, currentPlayer)
    }
  }, [state.events, currentPlayer, enabled])

  // Daily recap (once per calendar day, when a tab is open).
  useEffect(() => {
    if (!enabled || getPermission() !== 'granted') return
    const today = new Date().toDateString()
    const last = localStorage.getItem(RECAP_KEY)
    if (last === today) return
    const id = setTimeout(() => {
      const week = boards.week
      const me = currentPlayer
      let body: string
      if (me) {
        const opp = opponentOf(me)
        const mine = me === 'cam' ? week.cam : week.arthur
        const theirs = opp === 'cam' ? week.cam : week.arthur
        body =
          mine >= theirs
            ? `You lead ${mine}–${theirs} this week. Keep the boot on their neck.`
            : losingLine(me, opp, Date.now()) + ` (${theirs}–${mine} this week)`
      } else {
        body = `This week: Cam ${week.cam} — Arthur ${week.arthur}.`
      }
      fireRecap('☀️ TODO WAR daily standings', body)
      localStorage.setItem(RECAP_KEY, today)
    }, 4000)
    return () => clearTimeout(id)
  }, [enabled, boards, currentPlayer])
}
