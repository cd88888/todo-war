import type { GameState } from '../types'
import { inferCategory, inferPoints, normalize, similarity } from './voice'

// Learn from history: suggest a points value for a new task by looking at how
// similar past tasks were scored. Falls back to keyword inference, then 3.

export interface PointsSuggestion {
  points: number
  /** 'history' = learned from past tasks, 'keywords' = inferred from wording. */
  source: 'history' | 'keywords'
  /** How many past tasks informed a history-based suggestion. */
  basedOn: number
}

export function suggestPoints(
  title: string,
  category: string,
  state: GameState,
): PointsSuggestion {
  const q = normalize(title)
  if (!q) return { points: 3, source: 'keywords', basedOn: 0 }

  // Score every prior task by title similarity, with a category-match bonus.
  const scored = state.tasks
    .filter((t) => normalize(t.title) !== q) // ignore the task itself if re-adding
    .map((t) => {
      let sim = similarity(title, t.title)
      if (t.category && category && t.category.toLowerCase() === category.toLowerCase()) {
        sim = Math.min(1, sim + 0.15)
      }
      return { points: t.points, sim }
    })
    .filter((s) => s.sim >= 0.35)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 5)

  if (scored.length >= 1) {
    // Weighted average by similarity.
    const totalW = scored.reduce((sum, s) => sum + s.sim, 0)
    const weighted = scored.reduce((sum, s) => sum + s.points * s.sim, 0) / totalW
    const points = Math.max(1, Math.min(10, Math.round(weighted)))
    return { points, source: 'history', basedOn: scored.length }
  }

  return { points: inferPoints(title), source: 'keywords', basedOn: 0 }
}
