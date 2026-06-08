# TODO WAR ⚔️ — Cam vs Arthur

Real-time competitive to-do tracker. May the grind win.

## How to use it

**Phone (you both use this):**
- Open the app URL on your phone
- Tap **"I'm Cam"** or **"I'm Arthur"**
- Add tasks, check them off, talk shit

**Apartment monitor:**
- Open `<app-url>?view=dashboard` on whatever's connected to the TV
- No login needed — it just shows who's winning

## Scoring — the shared rubric (1–10)
Both players use the **same definitions** so nobody can fudge points. The rubric
shows up right in the editor when you score a task.

| Pts | Label | Means | Pts | Label | Means |
|----|-------|-------|----|-------|-------|
| 1 | Trivial | 2-min admin | 6 | Hard | Full day / key call |
| 2 | Quick | <15 min | 7 | Heavy | Multi-day, coordination |
| 3 | Small | ~30 min | 8 | Major | Closes something meaningful |
| 4 | Moderate | ~1 hr | 9 | Huge | Big deal / large $ |
| 5 | Solid | Half-day deliverable | 10 | Epic | Company-moving |

Click any points badge to re-score inline. Every change is logged in **Stats &
History** so it's all transparent.

## Adding tasks
- **+ Add task** — type or dictate (Wispr Flow) one task; points auto-suggested from history.
- **⊞ Bulk add** — paste a whole list, one per line. Optional tags:
  `#Category` · `p7` (points) · `!weekly` (repeat) · `*2` (urgency) · `@goal`
- **🎯 Goal** — a big gold-tinted scored task with a target month; nest to-dos under it.

## Organizing
- **Urgency:** drag the handle or use ▲▼ to rank to-dos. (Urgency ≠ points.)
- **Recurring:** weekly/daily/monthly tasks auto-respawn when completed.
- **Goals:** track month / multi-month aims; complete the nested steps to fill progress.

## Leaderboards & stats
Five live scoreboards (**Today · Week · Month · Quarter · All Time**), plus a
**Stats & History** view: full activity log, points-over-time, by-category, streaks,
win-rate, and JSON export/restore.

---

## For Arthur — editing via Claude Code
```bash
git clone https://github.com/cd88888/todo-war.git
cd todo-war
npm install
npm run dev      # http://localhost:5175
```
Open it in Claude Code and ask for changes. Then:
```bash
git checkout -b my-change
git commit -am "what I changed"
git push -u origin my-change   # open a PR on GitHub
```
Pushing to `main` auto-deploys to the live site via GitHub Actions.

Key files: `src/types/index.ts` (data model), `src/services/` (sync, scoring,
suggestions, seed), `src/components/` (UI). Data syncs through `src/services/sync/`.

---

*Built by Claude for Cam & Arthur. May the grind win.*
