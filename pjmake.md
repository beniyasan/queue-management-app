# Claude Code作業指示書：Supabase統合とVercel環境変数対応

## 📋 プロジェクト概要
- **プロジェクト名**: queue-management-app
- **GitHub**: https://github.com/beniyasan/queue-management-app
- **Vercel**: デプロイ済み、環境変数設定済み
- **Supabase**: プロジェクト作成済み、テーブル作成済み、RLS・リアルタイム設定済み

## 🎯 目標
現在の静的HTMLアプリを、Supabaseを使ったリアルタイム同期対応アプリに変換し、Vercel環境変数を適切に使用できるようにする。

## 🔧 必要な作業

### 1. ✅ Supabaseセットアップ（完了済み）
- テーブル作成済み（sessions, session_users）
- RLS設定済み
- リアルタイム機能有効化済み

### 2. プロジェクト構造の変更

**現在の構造**:
```
queue-management-app/
├── index.html
└── package.json
```

**変更後の構造**:
```
queue-management-app/
├── api/
│   └── config.js          # 環境変数を返すAPI
├── public/
│   └── index.html          # 更新されたHTML
├── package.json            # 更新
└── vercel.json             # Vercel設定
```

### 3. ファイル作成・更新内容

#### api/config.js
```javascript
export default function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY,
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

#### vercel.json
```json
{
  "functions": {
    "api/config.js": {
      "runtime": "@vercel/node"
    }
  },
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

#### package.json（更新）
```json
{
  "name": "queue-management-app",
  "version": "1.0.0",
  "description": "順番待ち管理アプリ（Supabase統合版）",
  "scripts": {
    "dev": "vercel dev",
    "build": "echo 'No build step required'",
    "start": "vercel dev"
  },
  "dependencies": {},
  "keywords": ["queue", "management", "webapp", "supabase", "realtime"],
  "author": "beniyasan",
  "license": "MIT"
}
```

#### public/index.html
現在のindex.htmlを基に、以下の変更を適用:

**変更点**:
1. Supabase CDNの追加: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`
2. 環境変数取得関数の実装
3. リアルタイム同期機能の実装
4. データベース操作の実装

**主要な変更箇所**:
```javascript
// 環境変数から設定を取得
async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
    return null;
  }
}

// Supabase初期化
async function initSupabase() {
  const config = await loadConfig();
  if (!config || !config.supabaseUrl || !config.supabaseKey) {
    console.error('Supabase configuration not found');
    return false;
  }
  
  supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
  return true;
}
```

### 4. Vercel環境変数確認

**設定済み環境変数**:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

**確認方法**: Vercelダッシュボード → Settings → Environment Variables

### 5. テスト項目

**基本機能**:
- [x] セッション作成
- [x] セッション参加
- [x] ユーザー追加
- [x] 交代機能
- [x] ユーザー削除

**リアルタイム機能**:
- [ ] 管理者の操作が閲覧者に即座に反映
- [ ] 複数デバイスでの同期
- [ ] 接続状態の表示

**エラーハンドリング**:
- [ ] ネットワークエラー時の処理
- [ ] Supabase接続エラー時の処理
- [ ] 無効なセッションコードの処理

### 6. デプロイ手順

1. **コード変更**: 上記の構造変更を実施
2. **GitHubプッシュ**: `git add .` → `git commit -m "Add Supabase integration"` → `git push`
3. **Vercel自動デプロイ**: GitHubプッシュ後、自動的にデプロイ実行
4. **動作確認**: デプロイ後、実際の機能テスト

### 7. 注意事項

- **Supabaseキー**: 既にVercel環境変数に設定済み、コードには直接書かない
- **CORS**: API経由での設定取得のため、CORS設定が必要
- **エラーハンドリング**: Supabase接続失敗時のフォールバック処理を実装
- **セキュリティ**: RLSポリシーにより、適切なアクセス制御を実装

### 8. 完了確認

以下の動作が確認できれば作業完了:
1. 環境変数が正しく読み込まれる
2. Supabaseに正常に接続できる
3. セッション作成・参加が動作する
4. リアルタイム同期が機能する
5. 複数ブラウザで同期が確認できる

## 🚨 重要な変更点

- **ファイル移動**: `index.html` → `public/index.html`
- **API追加**: `/api/config.js` で環境変数を提供
- **Supabase統合**: CDN経由でライブラリ読み込み
- **リアルタイム**: WebSocket接続によるリアルタイム同期

この指示書に従って、現在の静的HTMLアプリを本格的なリアルタイムWebアプリに変換してください。
