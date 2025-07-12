// Vercel環境変数を静的ファイルとして出力
// このファイルはビルド時に生成される

window.APP_CONFIG = {
  supabaseUrl: '{{ SUPABASE_URL }}',
  supabaseKey: '{{ SUPABASE_ANON_KEY }}'
};