import type { GameEvent, PlayerId } from '../types'
import { PLAYERS, opponentOf } from '../types'

// Local notification layer (Notification API). Fires while a tab is open — and the
// apartment monitor is always open, so alerts always land there. On deploy, the
// same trigger rules feed remote Web Push via the service worker (see public/sw.js).

export type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export function notifSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getPermission(): NotifPermission {
  if (!notifSupported()) return 'unsupported'
  return Notification.permission as NotifPermission
}

export async function requestPermission(): Promise<NotifPermission> {
  if (!notifSupported()) return 'unsupported'
  try {
    const res = await Notification.requestPermission()
    return res as NotifPermission
  } catch {
    return getPermission()
  }
}

function show(title: string, body: string, tag: string) {
  if (getPermission() !== 'granted') return
  try {
    new Notification(title, { body, tag, icon: '/icon-192.png', badge: '/icon-192.png' })
  } catch {
    /* some browsers require SW.showNotification; ignore in that case */
  }
}

/**
 * Decide whether an event should alert `me`, and produce the notification copy.
 * Returns null when the event shouldn't notify this device.
 */
export function notificationFor(
  ev: GameEvent,
  me: PlayerId | null,
): { title: string; body: string; tag: string } | null {
  // The monitor (no identity) shows everything; phones only get opponent news.
  const opp = me ? opponentOf(me) : null
  const fromOpponent = me ? ev.playerId === opp : true

  switch (ev.type) {
    case 'lead_change':
      if (!fromOpponent) return null
      return { title: '🚨 You just lost the lead', body: ev.message, tag: `lead-${ev.period}` }
    case 'milestone':
      if (!fromOpponent) return null
      return { title: '💥 Big move by your rival', body: ev.message, tag: `ms-${ev.id}` }
    case 'completed':
      if (!fromOpponent) return null
      return {
        title: `${PLAYERS[ev.playerId].name} completed a task`,
        body: ev.message,
        tag: `done-${ev.id}`,
      }
    default:
      return null
  }
}

export function fireForEvent(ev: GameEvent, me: PlayerId | null) {
  const n = notificationFor(ev, me)
  if (n) show(n.title, n.body, n.tag)
}

export function fireRecap(title: string, body: string) {
  show(title, body, 'daily-recap')
}
