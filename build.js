// Vercel環境変数を静的ファイルに埋め込むビルドスクリプト
const fs = require('fs');
const path = require('path');

console.log('Building configuration...');

// 環境変数を取得
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

console.log('Environment variables:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing'
});

// config.jsテンプレートを読み込み
const templatePath = path.join(__dirname, 'public', 'config.js');
let template = fs.readFileSync(templatePath, 'utf8');

// 環境変数を置換
template = template.replace('{{ SUPABASE_URL }}', supabaseUrl);
template = template.replace('{{ SUPABASE_ANON_KEY }}', supabaseKey);

// 出力
fs.writeFileSync(templatePath, template);

console.log('Configuration built successfully');