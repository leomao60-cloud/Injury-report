# Playdesk

Draw football plays, keep a playbook, and print call sheets and QB wristbands.
See `CLAUDE.md` for how the code is organised and `BUILD_PLAN.md` for the roadmap.

## Run it

You need Node.js 20 or newer.

```
cd playdesk
npm install
npm run dev
```

Then open http://localhost:5173 (landing page) or http://localhost:5173/app (editor).

## Check it

```
npm run typecheck && npm test && npm run lint
npm run test:e2e      # browser tests; first time only: npx playwright install chromium
```

## Deploy on Vercel

1. Go to https://vercel.com and sign in with GitHub.
2. Click **Add New… → Project**.
3. Find this repository and click **Import**.
4. Under **Root Directory**, click **Edit** and pick `playdesk`. (The app lives in this folder.)
5. Vercel detects **Vite**. Leave the build command (`npm run build`) and output directory (`dist`) as they are.
6. Click **Deploy**. When it finishes, click the preview image to open the live site.
7. From then on, every push to the default branch redeploys automatically.

`vercel.json` sends every path to `index.html`, so links like `/app/sheets` work on refresh.

## Where data lives

Plays and sheets are stored in the browser's IndexedDB on this device. The play open in the editor is also autosaved
in localStorage. Nothing is sent to a server. Use **Library → Export library** for a backup file.
