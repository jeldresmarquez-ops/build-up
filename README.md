# BUILD UP

**BECOME BETTER.** — TRAIN. EAT. GROW. REPEAT.

A home-training and nutrition web app (PWA). No backend, no accounts, no API keys – all data stays on the device (localStorage). Hosted for free on GitHub Pages.

## Features
- Cinematic welcome story (first launch only) + onboarding profile
- Startup quote screen on every launch (shuffle-bag rotation, offline)
- Dashboard: today's workout, progress, last workout, daily quote, next reminder
- Workout player: sets, reps, timed holds, rest timer, pause/continue, history
- 7 workout categories, personalized weekly plan with rest days
- Exercise library (17 exercises) with technique, mistakes, safety, dose per level
- Progress: consistency, weekly chart, period comparison, personal records
- Food scanner (camera barcode → Open Food Facts), manual search, history, green/orange/red composition indicator
- Motivation collection (20 quotes + your own, favourites, no duplicates)
- Reminders (in-app/system while open + calendar export), profile & settings, backup/reset

## Run locally
```
node scripts/serve.mjs
```
Then open http://localhost:5178.

## Adding exercise videos
Put an MP4 into `media/exercises/` (e.g. `pushup.mp4`) and set `video: 'media/exercises/pushup.mp4'` for that exercise in `js/data/exercises.js`.

## Deploy
Push to `main` – GitHub Pages serves the repository root. Bump `VERSION` in `sw.js` on every release so phones pick up the new version.
