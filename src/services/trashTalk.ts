import type { GameEvent, PlayerId } from '../types'
import { PLAYERS, opponentOf } from '../types'

// Flavor lines for notifications + the dashboard ticker. Kept PG-13-ish but spicy.

const LEAD_CHANGE = [
  (w: string, l: string) => `🚨 ${w} just yanked the lead from ${l}. Wake up.`,
  (w: string, l: string) => `${w} is now in front. ${l}, this is embarrassing.`,
  (w: string, l: string) => `Scoreboard flipped — ${w} over ${l}. Do something about it.`,
  (w: string, l: string) => `${w} smells blood. ${l} is officially losing.`,
  (w: string) => `${w} took the lead. Hope you like second place.`,
]

const MILESTONE = [
  (w: string) => `💥 ${w} just dropped a 10-pointer. Casual.`,
  (w: string) => `${w} closed an EPIC. The rest of you are doing... what exactly?`,
  (w: string) => `Big move from ${w}. +10 and zero remorse.`,
]

const OPP_COMPLETED = [
  (w: string) => `${w} checked another one off. Tick tock.`,
  (w: string) => `${w} is grinding while you read this.`,
  (w: string) => `Another one down for ${w}.`,
]

const LOSING = [
  (you: string, opp: string) => `${opp} is beating you, ${you}. Fix it.`,
  (you: string, opp: string) => `You're behind ${opp}. Embarrassing, ${you}.`,
]

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

/** A flavor line for a derived event (lead_change / milestone). */
export function lineFor(ev: GameEvent): string | null {
  const seed = ev.ts
  const winner = PLAYERS[ev.playerId].name
  const loser = PLAYERS[opponentOf(ev.playerId)].name
  if (ev.type === 'lead_change') return pick(LEAD_CHANGE, seed)(winner, loser)
  if (ev.type === 'milestone') return pick(MILESTONE, seed)(winner)
  if (ev.type === 'completed') return pick(OPP_COMPLETED, seed)(winner)
  return null
}

/** "You're losing" jab for daily recaps, addressed to a specific player. */
export function losingLine(you: PlayerId, opp: PlayerId, seed: number): string {
  return pick(LOSING, seed)(PLAYERS[you].name, PLAYERS[opp].name)
}
