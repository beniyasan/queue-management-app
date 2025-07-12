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

// config.jsファイルを生成
const configContent = `// Generated configuration file
window.APP_CONFIG = {
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}'
};
console.log('Config loaded:', { hasUrl: !!window.APP_CONFIG.supabaseUrl, hasKey: !!window.APP_CONFIG.supabaseKey });`;

const configPath = path.join(__dirname, 'public', 'config.js');
fs.writeFileSync(configPath, configContent);

// HTMLファイルにも直接埋め込み（バックアップ）
const htmlPath = path.join(__dirname, 'public', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 既存の埋め込みスクリプトを削除
htmlContent = htmlContent.replace(/<script id="env-config">[\s\S]*?<\/script>/g, '');

// 新しい設定スクリプトを埋め込み
const envScript = `
    <script id="env-config">
        window.APP_CONFIG = {
            supabaseUrl: '${supabaseUrl}',
            supabaseKey: '${supabaseKey}'
        };
        console.log('Environment config embedded:', { hasUrl: !!window.APP_CONFIG.supabaseUrl, hasKey: !!window.APP_CONFIG.supabaseKey });
    </script>`;

// </head>の直前に挿入
htmlContent = htmlContent.replace('</head>', `${envScript}\n</head>`);

fs.writeFileSync(htmlPath, htmlContent);

console.log('Configuration built successfully - both config.js and HTML embedding');