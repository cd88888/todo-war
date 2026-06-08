import type { GameState, PlayerId } from '../types'

// ── Step 1: Whisper transcription (same as weekly-pulse) ─────────────────────

export async function transcribeAudio(
  audioBlob: Blob,
  mimeType: string,
  openAIKey: string,
): Promise<string> {
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
  const form = new FormData()
  form.append('file', audioBlob, `recording.${ext}`)
  form.append('model', 'whisper-1')
  form.append('language', 'en')
  form.append('response_format', 'text')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openAIKey}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Whisper error ${res.status}: ${await res.text()}`)
  return res.text()
}

// ── Step 2: Claude parses the transcript into structured intents ──────────────

export type VoiceAction =
  | { type: 'complete'; taskId: string; taskTitle: string }
  | { type: 'reopen'; taskId: string; taskTitle: string }
  | { type: 'add'; title: string; category: string; points: 1 | 3 | 5 | 10; owner: PlayerId }
  | { type: 'unknown'; transcript: string }

function buildSystemPrompt(state: GameState, currentPlayer: PlayerId | null): string {
  const openTasks = state.tasks
    .filter((t) => t.status === 'open')
    .map((t) => `  - id:${t.id} | "${t.title}" | ${t.category} | ${t.points}pts | owner:${t.owner}`)
    .join('\n')
  const doneTasks = state.tasks
    .filter((t) => t.status === 'done')
    .map((t) => `  - id:${t.id} | "${t.title}" | owner:${t.owner}`)
    .join('\n')

  return `You are the voice command parser for TODO WAR, a competitive to-do app between Cam and Arthur.

Current user speaking: ${currentPlayer ?? 'unknown (dashboard)'}

OPEN TASKS:
${openTasks || '  (none)'}

RECENTLY COMPLETED TASKS:
${doneTasks.slice(0, 800) || '  (none)'}

Parse the voice transcript and return ONE JSON object with this shape:
{
  "action": "complete" | "reopen" | "add" | "unknown",
  "taskId": "<id from the lists above — only for complete/reopen>",
  "taskTitle": "<display name of the task>",
  "title": "<new task title — only for add>",
  "category": "<one of: Sales, Deals, Legal, Ops, Fundraising, AI / Automation, General — only for add>",
  "points": 1 | 3 | 5 | 10,
  "owner": "cam" | "arthur"
}

Rules:
- "complete" = user says they finished / done / checked off / closed / signed / crushed a task
- "reopen" = user wants to un-complete / reopen / undo a task
- "add" = user wants to add / create / put / track a new task
- "unknown" = you can't confidently determine the intent
- For complete/reopen: fuzzy-match the transcript to the closest open/done task by title (pick the best match)
- For add: infer category and points from the nature of the task (10=major deal/milestone, 5=real work, 3=meeting/call, 1=admin)
- Owner defaults to current user unless the user explicitly says "for Arthur" or "for Cam"
- Return ONLY the JSON object, no commentary, no markdown fences.`
}

export async function parseVoiceIntent(
  transcript: string,
  state: GameState,
  currentPlayer: PlayerId | null,
  anthropicKey: string,
): Promise<VoiceAction> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: buildSystemPrompt(state, currentPlayer),
      messages: [{ role: 'user', content: transcript }],
    }),
  })
  if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { content: Array<{ type: string; text: string }> }
  const text = data.content.find((c) => c.type === 'text')?.text ?? '{}'

  try {
    const parsed = JSON.parse(text.trim()) as {
      action?: string
      taskId?: string
      taskTitle?: string
      title?: string
      category?: string
      points?: number
      owner?: string
    }
    const action = parsed.action ?? 'unknown'

    if (action === 'complete' && parsed.taskId) {
      return { type: 'complete', taskId: parsed.taskId, taskTitle: parsed.taskTitle ?? '' }
    }
    if (action === 'reopen' && parsed.taskId) {
      return { type: 'reopen', taskId: parsed.taskId, taskTitle: parsed.taskTitle ?? '' }
    }
    if (action === 'add' && parsed.title) {
      const validPoints = [1, 3, 5, 10]
      const pts = validPoints.includes(parsed.points ?? 0) ? (parsed.points as 1 | 3 | 5 | 10) : 3
      const owner: PlayerId =
        parsed.owner === 'cam' || parsed.owner === 'arthur'
          ? parsed.owner
          : currentPlayer ?? 'cam'
      return {
        type: 'add',
        title: parsed.title,
        category: parsed.category ?? 'General',
        points: pts,
        owner,
      }
    }
    return { type: 'unknown', transcript }
  } catch {
    return { type: 'unknown', transcript }
  }
}
