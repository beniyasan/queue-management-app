# Style and Conventions

- Language: Vanilla JavaScript in-browser; HTML/CSS in `public/index.html`
- Naming: `lowerCamelCase` for JS variables/functions; UPPER_SNAKE for constants if needed
- Modules: No bundler; scripts loaded via CDN; keep code browser-compatible
- Comments: Concise comments in Japanese where helpful; UI strings are Japanese
- Semicolons: Present in JS; keep consistent
- Indentation: 4 spaces in HTML/CSS/JS blocks in `index.html`
- CSS: Embedded styles; use descriptive class names; follow existing gradient/color scheme
- Types: No TypeScript; avoid TS-specific syntax
- Files: Keep logic in `public/index.html`; config via generated `public/config.js`; serverless code in `supabase/functions/*`
- Security: Do not commit secrets; rely on `SUPABASE_URL` and `SUPABASE_ANON_KEY` via build embedding