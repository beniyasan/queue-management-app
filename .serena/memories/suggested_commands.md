# Suggested Commands

- Dev server: `npm run dev` (requires Vercel CLI; serves `public/`)
- Build config: `npm run build` (generates `public/config.js` and embeds env into `index.html`)
- Start (same as dev): `npm start` -> `vercel dev`
- Deploy (GitHub + Vercel): push to default branch; Vercel builds with `npm run build` and serves `public/`
- Supabase Edge Function deploy: `supabase functions deploy cleanup-sessions`
- SQL setup: Run `database/cleanup_old_sessions.sql` in Supabase SQL editor
- Check repo files: `ls -la`, `tree -L 2` (if installed)
- Search code: `rg "pattern" -n` (ripgrep) or `grep -R "pattern" .`
- Format HTML/CSS/JS (manual): use your editor formatter; no repo-configured linter/formatter
- Git basics: `git add -A && git commit -m "msg" && git push`