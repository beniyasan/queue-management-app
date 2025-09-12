# Task Completion Checklist

- Run build: `npm run build` to regenerate `public/config.js` and embed env into `index.html`
- Verify local dev: `npm run dev` (Vercel CLI) and load the app; confirm Supabase connection passes test in console
- Confirm env vars: Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Vercel project settings
- If editing DB schema or cleanup logic:
  - Apply SQL: run `database/cleanup_old_sessions.sql` in Supabase SQL editor
  - (If needed) update RPC names used by Edge Function
- If editing Edge Function:
  - Deploy: `supabase functions deploy cleanup-sessions`
  - Re-check Cron in dashboard (02:00 UTC)
- Smoke test flows:
  - Create session; add/remove users; reorder via drag; rotate; approval flow if enabled; admin/viewer URLs
- Docs: Update `README.md` if commands, env, or flows changed
- Git: `git add -A && git commit -m "..." && git push`