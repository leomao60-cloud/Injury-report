# Playdesk

A football play designer for coaches: draw plays on a real field, keep a searchable playbook,
and print call sheets and QB wristbands. Built from `BUILD_PLAN.md`.

**Current phase:** Phase 4, Step 13 (feedback loop). Steps 1–12 are done.

## Stack

Vite + React 18 + TypeScript (strict), Zustand, CSS Modules, Vitest, Playwright, ESLint + Prettier.
Runtime libraries: `idb` (IndexedDB), `jspdf` + `svg2pdf.js` (vector PDF), `pptxgenjs` (PowerPoint).
Export libraries are loaded on demand (dynamic `import()`), so they don't slow down the editor.

## Scripts

| Command             | What it does                                                    |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Start the app at http://localhost:5173                          |
| `npm run typecheck` | TypeScript, no emit                                             |
| `npm test`          | Vitest unit tests (`src/**/*.test.ts`)                          |
| `npm run test:e2e`  | Playwright browser tests (`e2e/`), starts the dev server itself |
| `npm run lint`      | ESLint                                                          |
| `npm run format`    | Prettier                                                        |
| `npm run build`     | Production build into `dist/`                                   |

Finish every change by running typecheck, test and lint.

## Folder layout

```
src/
  model/     pure TypeScript: types, field geometry, formations, play operations, examples. No React.
  render/    pure SVG components: Field, PlayerMarker, PlayLineView, PlayDiagram
  store/     Zustand stores: playStore (play + undo history), editorStore (tool, selection, draft)
  editor/    the editor screen: FieldEditor (pointer input), ToolRail, SidePanel, drawing logic, shortcuts
  library/   IndexedDB library, search, backup import/export + validation, autosave
  sheets/    call sheets and wristbands: page layout math, numbering, print preview
  export/    PNG, PDF and PowerPoint export
  app/       App shell, header, router, landing page
  styles/    tokens.css (light + dark themes), global.css
e2e/         Playwright tests
docs/        notes (usability review)
```

## Coordinates and types

All play coordinates are **yards**. `x` is distance from the left sideline (0 to 53.33),
`y` is distance from the line of scrimmage, positive downfield. The SVG draws in the same units
(`svg y = -y`) through the viewBox, so nothing is converted to pixels.

```ts
type Level = 'hs' | 'college' | 'nfl';
type FieldStyle = 'turf' | 'whiteboard';
type BallOn = 'left' | 'middle' | 'right';
interface Player { id; side: 'offense' | 'defense'; label (≤3 chars); shape: 'circle' | 'square' | 'letter'; x; y; color? }
interface PlayLine { id; playerId; type: 'route' | 'block' | 'motion'; points: Point[] /* start excluded */; color? }
interface Play { id; name; level; ballOn; ballX; formation; showDefense; players; lines }
```

A line's start is derived with `lineStart()`: routes and blocks start where the player's motion ends.
Hash widths: HS 53′4″, college 40′, NFL 18′6″.

## Rules

- Every change to a play goes through a pure function in `src/model` and is applied with
  `usePlayStore.apply(fn)`, so it is undoable. Drags use `beginDrag / dragTo / endDrag` = one undo step.
- `src/render` components are pure and use fixed colors (`render/theme.ts`), never CSS variables,
  so drawings look the same on screen, in print and in exports.
- Treat imported backup files as untrusted: everything goes through `library/validate.ts`.
- Layout must work at 400px wide (one column under 720px) and in dark mode.
  Every control needs a visible focus state and an accessible name.
- Ask before adding a new npm dependency.

## Legal guardrails

- Sheets, wristbands and exports are **generated from play data** (`PlayDiagram`, `diagramShapes`).
  Never build them by pasting drawings or screenshots into template boxes.
- Before charging money, have a patent attorney review the sheets and export features.
