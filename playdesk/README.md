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

## Use Playdesk inside PowerPoint (add-in)

Playdesk runs as a PowerPoint task-pane add-in and inserts plays as normal, editable slides.

1. Deploy the app (above). `npm run build` writes `dist/office/manifest.xml` pointing at your site.
   On Vercel the address is picked up automatically; elsewhere set `PLAYDESK_URL=https://your-site` before building.
2. Download the manifest from `https://your-site/office/manifest.xml` (the landing page links to it).
3. In PowerPoint: **Home → Add-ins → More Add-ins → My Add-ins → Upload My Add-in**, and pick the file.
   A school IT admin can deploy the same file to every coach from the Microsoft 365 admin center.
4. Click **Playdesk** on the Home tab. **Insert into PowerPoint** appears in the editor, Library and Sheets.

Needs PowerPoint 2019 or Microsoft 365 (desktop, Mac or web), which support `PowerPointApi 1.2`.

## Visio

Microsoft only lets add-ins like this run inside Visio on the web, so Playdesk supports Visio through files: download
`.vsdx` from the editor (one play), the Library (whole playbook) or Sheets (numbered plays), and open them in
Visio. Each play is a page, and every player and route is an ordinary Visio shape.

## Where data lives

Plays and sheets are stored in the browser's IndexedDB on this device. The play open in the editor is also autosaved
in localStorage. Nothing is sent to a server. Use **Library → Export library** for a backup file.
