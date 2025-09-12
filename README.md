# Queue Party

リアルタイム同期機能を備えた、シンプルで使いやすい順番待ち管理Webアプリケーションです。

## 🎯 概要

このアプリケーションは、ゲーム待機やイベント参加などの順番待ちを効率的に管理するためのツールです。管理者は参加者の追加・削除・交代を管理でき、閲覧者はリアルタイムで状況を確認できます。

## ✨ 主な機能

### 📱 基本機能
- **セッション管理**: 簡単なコードでセッションを作成・参加
- **ユーザー管理**: 参加者の追加・削除・順番管理
- **ドラッグ&ドロップ順番変更**: パーティー参加者の順番を直感的に変更
- **交代機能**: 1〜3人ずつの柔軟な交代システム
- **パーティーサイズ**: 5人・6人パーティーに対応

### ⚡ リアルタイム機能
- **リアルタイム同期**: Supabaseを使用した即座のデータ同期
- **マルチデバイス対応**: 複数デバイスでの同時監視
- **接続状態表示**: リアルタイム接続の状態を可視化

### 🔐 権限管理
- **管理者モード**: セッション作成者による完全な管理権限
- **閲覧専用モード**: 参加者向けのリアルタイム状況確認
- **URL共有**: 閲覧専用URLと管理者URL（秘匿）の分離

### 📊 統計・表示機能
- **リアルタイム統計**: パーティー参加者数・待機者数・総参加者数
- **直感的UI**: わかりやすいカードレイアウトとグラデーション
- **レスポンシブデザイン**: モバイル・デスクトップ両対応

### 🧹 自動データ管理
- **24時間自動削除**: 24時間“非活動”のセッションを自動クリーンアップ（updated_at基準、関連更新で自動タッチ）
- **ログ管理**: 削除処理の履歴追跡とログ保持（7日間）
- **定期実行**: 毎日午前2時（UTC）の自動実行

## 🛠️ 技術スタック

### フロントエンド
- **HTML5/CSS3**: モダンなレスポンシブデザイン
- **Vanilla JavaScript**: 軽量でパフォーマンス重視
- **SortableJS**: ドラッグ&ドロップ機能ライブラリ
- **CSS Grid/Flexbox**: 柔軟なレイアウトシステム

### バックエンド・データベース
- **Supabase**: PostgreSQLベースのBaaS
  - リアルタイムデータベース
  - Row Level Security (RLS)
  - WebSocketによるリアルタイム通信
- **Vercel**: サーバーレスホスティング・デプロイ

### データ構造
```sql
-- sessions テーブル
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  session_code VARCHAR(8) UNIQUE NOT NULL,
  master_name VARCHAR(255) NOT NULL,
  party_size INTEGER NOT NULL,
  rotation_count INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- session_users テーブル  
CREATE TABLE session_users (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(20) NOT NULL, -- 'party' または 'queue'
  order_index INTEGER NOT NULL,
  is_fixed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 セットアップ・デプロイ

### 必要な環境変数
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### プロジェクト構造
```
queue-management-app/
├── public/
│   ├── index.html      # メインアプリケーション
│   └── config.js       # 環境変数（ビルド時生成）
├── build.js            # ビルドスクリプト
├── package.json        # プロジェクト設定
├── vercel.json         # Vercel設定
└── README.md           # このファイル
```

### デプロイ手順
1. **Supabaseプロジェクト作成**
   ```sql
   -- 必要なテーブルとRLSポリシーを設定
   ```

2. **Vercel環境変数設定**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

3. **24時間“非活動”自動削除機能の設定（オプション）**
   ```bash
   # 1. SQLファイルをSupabaseで実行
   # database/cleanup_old_sessions.sql の内容をクエリエディタで実行
   
   # 2. Edge Functionをデプロイ
   supabase functions deploy cleanup-sessions
   
   # 3. Cronジョブ設定（Supabaseダッシュボード）
   # Function: cleanup-sessions
   # Schedule: 0 2 * * * (毎日午前2時UTC)
   ```

4. **GitHubからデプロイ**
   ```bash
   git add .
   git commit -m "Deploy queue management app"
   git push origin main
   ```

4. **自動ビルド・デプロイ**
   - Vercelが自動的にビルド・デプロイを実行

## 📝 使用方法

### 管理者（セッション作成者）
1. **セッション開始**
   - 主ユーザー名を入力（省略可）
   - パーティーサイズ（5人・6人）を選択
   - 交代人数（1〜3人）を選択

2. **参加者管理**
   - ユーザー名を入力して参加者を追加
   - パーティー参加者とキュー待機者を管理
   - ドラッグ&ドロップでパーティー参加者の順番を変更
   - 不要な参加者を削除（主ユーザーは削除不可）

3. **交代実行**
   - 「次へ」ボタンで指定人数ずつ交代
   - 設定変更で交代人数やパーティーサイズを調整

4. **URL共有**
   - 閲覧専用URLを参加者に共有
   - 管理者URLは秘匿して管理者のみ使用

### 閲覧者（参加者）
1. **セッション参加**
   - 共有された閲覧専用URLにアクセス

2. **リアルタイム監視**
   - パーティー状況と待機状況をリアルタイムで確認
   - 接続状態を画面上で確認

## 🔧 カスタマイズ・拡張

### スタイルカスタマイズ
- `public/index.html`内のCSSで見た目を調整
- グラデーション、色合い、レイアウトの変更が可能

### 機能拡張
- パーティーサイズの選択肢追加
- 交代ルールのカスタマイズ
- キュー待機者のドラッグ&ドロップ機能追加
- 通知機能の追加
- チャット機能の追加

## 🐛 トラブルシューティング

### よくある問題
1. **環境変数が読み込めない**
   - Vercelの環境変数設定を確認
   - ビルドスクリプトのログを確認

2. **リアルタイム同期が動作しない**
   - Supabaseのリアルタイム機能設定を確認
   - ネットワーク接続状態を確認

3. **セッションが見つからない**
   - セッションコードが正しいか確認
   - データベースの接続状態を確認

## 📄 ライセンス

MIT License

## 👤 作者

beniyasan

## 🔗 リンク

- **GitHub**: https://github.com/beniyasan/queue-management-app
- **Vercel**: デプロイ済みアプリケーション

---

*このアプリケーションは、ゲーム待機やイベント管理を効率化するために開発されました。シンプルな操作でありながら、リアルタイム同期による高度な機能を提供します。*
