const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const output = html
  .replace('YOUR_SUPABASE_URL', process.env.SUPABASE_URL)
  .replace('YOUR_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);

fs.writeFileSync('dist/index.html', output);
