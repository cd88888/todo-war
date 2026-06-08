import type { GameState, PlayerId, PointsTier } from '../types'

// ── Intent types ─────────────────────────────────────────────────────────────

export type VoiceAction =
  | { type: 'complete'; taskId: string; taskTitle: string }
  | { type: 'reopen'; taskId: string; taskTitle: string }
  | { type: 'add'; title: string; category: string; points: PointsTier; owner: PlayerId }
  | { type: 'unknown'; transcript: string }

// ── Simple fuzzy match — find the closest task title ─────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const aWords = new Set(na.split(' ').filter(Boolean))
  const bWords = nb.split(' ').filter(Boolean)
  const hits = bWords.filter((w) => aWords.has(w)).length
  return bWords.length > 0 ? hits / Math.max(aWords.size, bWords.length) : 0
}

function bestMatch(
  transcript: string,
  tasks: GameState['tasks'],
  statusFilter: 'open' | 'done',
): (typeof tasks)[0] | null {
  const candidates = tasks.filter((t) => t.status === statusFilter)
  if (!candidates.length) return null

  let best = candidates[0]
  let bestScore = similarity(transcript, candidates[0].title)

  for (const t of candidates.slice(1)) {
    const score = similarity(transcript, t.title)
    if (score > bestScore) {
      bestScore = score
      best = t
    }
  }

  return bestScore >= 0.2 ? best : null
}

// ── Category + points inference from keywords ─────────────────────────────────

export function inferCategory(text: string): string {
  const t = text.toLowerCase()
  if (/\b(deal|msa|loi|close|kodiak|contract|agreement|purchase|lease|commitment)\b/.test(t)) return 'Deals'
  if (/\b(sales|pitch|script|outreach|prospect|crm|salesforce|pipeline)\b/.test(t)) return 'Sales'
  if (/\b(lawyer|legal|lawsuit|attorney|medicaid|va |compliance)\b/.test(t)) return 'Legal'
  if (/\b(hire|onboard|recruit|dry clean|expert|staff)\b/.test(t)) return 'Ops'
  if (/\b(raise|cap|investor|fund|investment|equity)\b/.test(t)) return 'Fundraising'
  if (/\b(ai|claude|automat|bot|whisper|gpt|llm|workflow)\b/.test(t)) return 'AI / Automation'
  return 'General'
}

export function inferPoints(text: string): PointsTier {
  const t = text.toLowerCase()
  // Epic (10): major deals, milestones, fundraising closes
  if (/\b(epic|major|huge|massive|close|signed|million|raise|acquire|acquisition)\b/.test(t)) return 10
  // Hard (5): real work blocks
  if (/\b(hard|big|important|plan|build|implement|negotiate|attorney|draft)\b/.test(t)) return 5
  // Medium (3): calls, meetings, reviews
  if (/\b(medium|call|meet|review|send|email|follow.?up|check)\b/.test(t)) return 3
  // Quick (1): small admin
  if (/\b(quick|easy|fast|small|admin|update|minor)\b/.test(t)) return 1
  return 3
}

// ── Main parser — no API needed ───────────────────────────────────────────────

const COMPLETE_WORDS =
  /\b(done|finished|completed?|closed?|crushed?|nailed?|knocked? out|checked? off|signed?|wrapped?|sent|paid|filed|submitted)\b/i

const REOPEN_WORDS =
  /\b(re-?open|undo|revert|uncheck|not done|didn'?t|not finished|still open|actually)\b/i

const ADD_WORDS =
  /\b(add|create|new task|put|track|need to|gotta|have to|remember to|log)\b/i

// detect "for Arthur" / "for Cam" owner override
function detectOwner(text: string, defaultOwner: PlayerId): PlayerId {
  if (/\bfor arthur\b/i.test(text)) return 'arthur'
  if (/\bfor cam\b/i.test(text)) return 'cam'
  return defaultOwner
}

// strip leading verb phrases so we extract the task title cleanly
function stripAddVerb(text: string): string {
  return text
    .replace(/^(please |can you |i need to |i gotta |i want to |remember to |log |track |put |add |create |new task |need to )+/i, '')
    .replace(/\s*(for (arthur|cam))\s*$/i, '')
    .trim()
}

export function parseVoiceIntent(
  transcript: string,
  state: GameState,
  currentPlayer: PlayerId | null,
): VoiceAction {
  const text = transcript.trim()
  if (!text) return { type: 'unknown', transcript }

  const owner: PlayerId = currentPlayer ?? 'cam'

  // ── Reopen ──────────────────────────────────────────────────────────────────
  if (REOPEN_WORDS.test(text)) {
    const match = bestMatch(text, state.tasks, 'done')
    if (match) return { type: 'reopen', taskId: match.id, taskTitle: match.title }
  }

  // ── Complete ─────────────────────────────────────────────────────────────────
  if (COMPLETE_WORDS.test(text)) {
    const match = bestMatch(text, state.tasks, 'open')
    if (match) return { type: 'complete', taskId: match.id, taskTitle: match.title }
    // fallback: maybe they mentioned a done task title with "done"
    const doneMatch = bestMatch(text, state.tasks, 'done')
    if (doneMatch) return { type: 'reopen', taskId: doneMatch.id, taskTitle: doneMatch.title }
  }

  // ── Add ──────────────────────────────────────────────────────────────────────
  if (ADD_WORDS.test(text)) {
    const rawTitle = stripAddVerb(text)
    return {
      type: 'add',
      title: rawTitle || text,
      category: inferCategory(rawTitle),
      points: inferPoints(rawTitle),
      owner: detectOwner(text, owner),
    }
  }

  // ── Fallback: if text strongly matches an open task, complete it ─────────────
  const fuzzy = bestMatch(text, state.tasks, 'open')
  if (fuzzy && similarity(text, fuzzy.title) >= 0.5) {
    return { type: 'complete', taskId: fuzzy.id, taskTitle: fuzzy.title }
  }

  return { type: 'unknown', transcript }
}
