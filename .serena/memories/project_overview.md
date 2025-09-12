# Project Overview

- Purpose: Real-time queue/party management web app with admin and viewer modes, optimized for simple sessions and rotations
- Hosting: Vercel (static output served from `public/`)
- Realtime backend: Supabase (Postgres + Realtime, RLS)
- Edge function: `supabase/functions/cleanup-sessions` to purge 24h-old sessions and 7d-old logs
- Build: `build.js` embeds `SUPABASE_URL` and `SUPABASE_ANON_KEY` into `public/config.js` and `index.html`
- Entrypoint: `public/index.html` (loads Supabase and SortableJS via CDN)
- Environment: Linux dev; Vercel CLI for local dev; Supabase CLI/console for functions/SQL
- Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (required)
- Docs: `README.md` (features, setup, deploy), `SETUP_CLEANUP.md`, `QUICK_SETUP_CLEANUP.md`, `ARTICLE.md`, `BLOG_ARTICLE.md`