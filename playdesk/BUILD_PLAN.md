# Playdesk build plan for Claude Code

This is the step-by-step process for building Playdesk with Claude Code. Each step has a prompt you paste in, and a checklist you use to test the result before moving on.

---

## Part A. One-time setup (about 30 minutes)

1. **Get Claude Code.** You need a paid Claude plan. Either:
   - install the Claude desktop app, sign in, and open the **Code** tab, or
   - install the terminal version: on Mac, run `curl -fsSL https://claude.ai/install.sh | bash`. On Windows PowerShell, run `irm https://claude.ai/install.ps1 | iex`.
2. **Install the basics:** Node.js (the LTS version from nodejs.org) and Git (git-scm.com). Create a free GitHub account.
3. **Make the project folder:**
   ```
   playdesk/
     CLAUDE.md                      ← from this kit
     BUILD_PLAN.md                  ← this file
     reference/
       playdesk-prototype.html      ← from this kit
   ```
4. **Open Claude Code in that folder.** In the terminal, `cd playdesk` then run `claude`. In the desktop app, pick the `playdesk` folder when you start a Code session.
5. **Check that it read the brief.** Paste: `Summarize CLAUDE.md in five bullet points and open reference/playdesk-prototype.html to see what we're building. Don't write code yet.`

---

## Part B. How to run every step (the loop)

1. **Start fresh.** Type `/clear` so the new step isn't cluttered by the last one. CLAUDE.md is read again automatically.
2. **Paste the step's prompt.** For steps marked **Plan first**, switch to plan mode before pasting (in the terminal, Shift+Tab cycles modes). Read the plan, change anything you disagree with, then approve.
3. **Let it work.** Approve commands when it asks. It should finish by running typecheck, tests and lint.
4. **Test it yourself** with the step's checklist. Run `npm run dev` and open http://localhost:5173.
5. **If something is wrong,** use the fix prompt at the bottom of this file. You can drag a screenshot straight into Claude Code.
6. **Save your progress:** `Commit this with a clear message and push to GitHub.`
7. **Update CLAUDE.md:** change the "Current phase" line to the next step.

Rule of thumb: never start a new step while the current one is broken.

---

## Phase 1. Foundation

### Step 1. Project setup

```
Read CLAUDE.md and look at reference/playdesk-prototype.html so you understand the goal.
Set up the project only, no features yet:
- Vite + React 18 + TypeScript (strict), Zustand, Vitest, Playwright, ESLint + Prettier, CSS Modules
- the npm scripts and folder layout listed in CLAUDE.md
- src/styles/tokens.css with a light and a dark theme (follows the computer's setting)
- an empty app shell: header with the app name, a tool rail on the left, the main field area, a side panel on the right; stacks into one column under 720px wide
- git initialized with a sensible .gitignore
Run typecheck, test and lint, then tell me how to start the app.
```

**Check:** the app opens; the layout stacks on a narrow window; switching the computer to dark mode changes the colors.
**Then:** `Create a private GitHub repository called playdesk and push this. Walk me through any step I need to do myself.`

### Step 2. Play data and logic (Plan first)

```
Build src/model as pure TypeScript with no UI:
- the types in CLAUDE.md
- createPlay, movePlayer (moves that player's lines too), flipPlay, setBallSpot (shifts everything and keeps players inside the sidelines), setLevel, lineStart (routes and blocks start where motion ends), snapToGrid, applyFormation, placeDefense
- formations: Doubles, Trips Right, Bunch Right, I-Right, Empty 3x2 (start from the prototype's coordinates)
- a 4-3 two-deep defense whose corners line up over the widest receivers
Write thorough Vitest tests, including: flipping twice returns the original play; moving a player moves its lines; the ball lands on the correct hash for high school, college and NFL; every formation has exactly 7 offensive players on the line of scrimmage.
```

**Check:** `npm test` passes. Ask: `Explain in plain English what each test checks.` Every test should make sense to you as a coach.

### Step 3. Drawing the field

```
Build the SVG renderer in src/render as pure components:
- <Field> with level (hs/college/nfl) and style (turf/whiteboard): yard lines every 5, hash ticks every yard at the correct hash width, sidelines, a blue line of scrimmage, yard labels
- <PlayerMarker>: offense circles, center as a square, defenders as red letters
- <PlayLineView>: route = arrowhead, block = T-bar, motion = dashed with arrowhead
- <PlayDiagram play options>: puts it all together; used later for thumbnails, sheets and exports
Everything is drawn in yard units through the viewBox. Show the "Doubles Rt Smash" example from the prototype in the main area, and compare your result against the prototype side by side.
```

**Check:** it looks like the prototype; the hashes move when you change the level in code; the whiteboard style looks clean enough to print.

---

## Phase 2. The editor

### Step 4. Moving players

```
Make the field interactive with the Move tool:
- pointer events (mouse, touch and pen), converting screen position to yards
- drag players with half-yard snapping (add a "Snap to half-yard grid" checkbox in the side panel)
- a player's lines move with him
- click a player or a line to select it; the selected item gets an orange highlight; click empty field to deselect
- a live readout under the field, e.g. "6 yd right of ball · +9 yd past LOS"
Keep the play in a Zustand store and route every change through src/model functions.
```

**Check:** dragging feels smooth; routes follow the player. In Chrome, open DevTools and turn on the device toolbar (phone view) to test touch dragging.

### Step 5. Drawing routes, blocks and motion

```
Add the tool rail: Move (V), Route (R), Block (B), Motion (M), Erase (E). Make drawing behave like the prototype:
- click a player to start, click the field to add each break
- finish by clicking the last point again, pressing Enter, or pressing a "Finish line" button (needed on touch screens)
- Backspace removes the last point; Esc cancels the line
- a dashed preview segment follows the cursor
- clicking a teammate while drawing finishes the current line and starts his
- while drawing a block, clicking a defender ends the block on him
- after a player's motion, his route starts where the motion ends
- Erase: click a line to delete it, or click a player to delete all his lines
- a hint under the field that changes with the tool
```

**Check:** draw a smash concept, a zone-block scheme and a jet motion plus route. Try it on the phone view too.

### Step 6. Editing, undo and flip

```
Add:
- side panel "Selection": for a player, edit the label (up to 3 characters) and fill color, and erase his lines; for a line, change its type (route/block/motion) and color, or delete it
- undo and redo (buttons, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z) keeping up to 100 steps; a whole drag counts as one step
- Flip play (F) and Clear lines
Add tests for the history store.
```

**Check:** undo a drag in one press; flip twice to get the original back; undo a flip.

### Step 7. Formations, defense and field settings

```
Add side panel sections:
- Formation: dropdown plus "Reset to formation" (existing lines move with their players)
- Ball on: Left hash / Middle / Right hash
- Show defense (4-3, two-deep) toggle
- Field: level (High school / College / NFL) with a note on hash width, and a Turf / Whiteboard toggle
Every change is undoable and goes through src/model.
```

**Check:** put the ball on the left hash at the NFL level, then at the high school level; receivers never end up outside the sidelines.

### Step 8. Polish and browser tests

```
Review the editor as a high school coach using it for the first time, and list the ten biggest usability problems. Wait for me to pick which to fix.
Then:
- write Playwright tests: draw a route, drag a player, flip, undo, redo
- check the layout at 400px and 1440px wide and in dark mode, and fix any problems
- make sure every button has a visible focus state and an accessible label
```

**Check:** `npm run test:e2e` passes. Hand the app to someone who has never seen it and watch them draw a play without helping.

---

## Phase 3. Library, sheets and export

### Step 9. Play library (Plan first)

```
Build the play library, stored in the browser with IndexedDB (suggest a small library and ask me before adding it):
- Save, Save as copy, rename, and delete with a confirm step
- folders (Offense, Defense, Special teams, plus my own) and tags
- search by name, tag or formation
- a thumbnail for each play, drawn with <PlayDiagram>
- autosave the play I'm working on so a refresh never loses work
- three starter plays marked "Example"
- export the whole library to a JSON backup file, and import it back
```

**Check:** save ten plays, refresh the browser, and they're still there; export, clear site data, import, and everything comes back.

### Step 10. Call sheets and wristbands (Plan first)

```
Add a Sheets screen:
- choose plays by folder, search or checkboxes, and drag to reorder
- layouts: 1, 2, 4 or 8 plays per page, landscape or portrait
- each play shows its number, name and diagram in the whiteboard style
- numbering: start number, skip a number, renumber
- a wristband layout: a grid of numbered play calls sized in inches (default a 3-panel QB wristband), with text only
- print-ready at US Letter using CSS @page
- save sheets so I can reopen and edit them
Sheets are drawn from play data. Do not build them by pasting drawings into template boxes (see the legal guardrails in CLAUDE.md).
```

**Check:** print an 8-up sheet and a wristband on real paper; the numbers match the play order; the lines are crisp.

### Step 11. Export

```
Add export (ask me before adding each library):
- PNG of a single play
- PDF of any sheet, as vector graphics
- PowerPoint: one play per slide or the sheet layouts, with players and lines as editable PowerPoint shapes where possible
Test that the exported files open correctly in PowerPoint, Keynote and Google Slides.
```

**Check:** open every export on your own computer and fix one play inside PowerPoint to make sure it's editable.

---

## Phase 4. Put it in front of coaches

### Step 12. Deploy

```
Get the app ready to deploy on Vercel:
- a simple landing page at / explaining what Playdesk does, with the editor at /app
- page titles and descriptions
- a short privacy note saying plays are stored in this browser for now
Walk me through connecting the GitHub repo to Vercel one click at a time.
```

**Check:** open the live link on your phone and on a school Chromebook if you can.

### Step 13. Feedback loop

```
Add a "Send feedback" button that opens a short form (what were you trying to do, what happened), and privacy-friendly usage analytics counting plays created, sheets printed and exports (suggest options and ask me).
```

**Then stop building for 1–2 weeks.** Give the link to 5–10 coaches and collect their notes. Paste them into Claude Code with:

```
Here is feedback from coaches: [paste]. Group it into themes, rank by how many coaches mentioned it and how much it blocks them, and propose the next five changes. Don't write code yet.
```

---

## Phase 5. Accounts, teams and payments

### Step 14. Accounts and cloud sync (Plan first)

```
Add Supabase:
- sign in with an email magic link
- tables for plays, folders and sheets, with row-level security so each user only sees their own data
- on first sign-in, offer to move the browser library into the account
- keep working offline and sync when back online, with last edit winning
- keys only in .env.local, never committed
Tell me exactly what to click in the Supabase dashboard, and add tests that prove one user can't read another user's plays.
```

### Step 15. Team playbooks (Plan first)

```
Add teams:
- a head coach creates a team and invites staff by email
- roles: owner, editor, viewer
- a shared team library next to my personal library, and "Copy to team"
- row-level security tests for every role
```

### Step 16. Payments (Plan first)

```
Add Stripe billing in test mode:
- Free: one coach, up to 25 plays, PDF export
- Team: unlimited plays, PowerPoint export, team sharing, billed yearly
Include Checkout, the customer portal, and a webhook that updates the plan in Supabase. List what I need to set up in Stripe.
```

### Step 17. Security review before real launch

```
Do a security and privacy review of the whole app: row-level security, secrets, input validation, file imports, rate limits, and npm audit. Fix the high-risk issues and list the rest for me. Then draft a Terms of Service and Privacy Policy for me to have a lawyer review.
```

Before taking payments, also have a patent attorney review the sheets and export features, as noted in CLAUDE.md.

---

## Prompts you'll reuse

**When something is broken**

```
Something is wrong.
What I did: ...
What I expected: ...
What happened: ... (error text or screenshot attached)
Find the cause before changing any code and explain it in one or two sentences. Then fix it and add a test so it doesn't come back.
```

**When you're lost in the code**

```
Explain how [feature] works in this codebase, in plain English, with the files involved.
```

**Before committing a bigger change**

```
Review everything changed since the last commit for bugs, missing tests and anything that breaks the rules in CLAUDE.md. List problems first; don't fix yet.
```

**Undo a bad direction**

```
Throw away the changes since the last commit.
```

## Ideas for later

Hudl or other film-tool imports, practice scripts, scout cards made from opponent tendencies, animated play playback for players, and Apple Pencil drawing on iPad.
