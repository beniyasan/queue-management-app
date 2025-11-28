# Queue Party - アプリケーション仕様書

## 1. 概要

**Queue Party** は、パーティー/待機列のローテーションを管理するための軽量なリアルタイムWebアプリケーションです。管理者は参加者の追加・削除・固定・交代を操作でき、閲覧者はリアルタイムで状況を確認できます。UIはAtlassian Design Systemを参考にしつつ、React Islands（Atlaskit）で段階的に強化しています。

### 主なユースケース
- ローテーションシステムを使用したオンラインゲームのパーティー管理
- リアルタイム更新機能を備えたイベント待機列管理
- ライブ同期を必要とする順序付き参加者ローテーションのあらゆるシナリオ

## 2. 機能ハイライト

### 2.1 セッション管理
- **セッションの作成/共有**: 管理者用と閲覧者用で別々のURL
- **セッションコード**: 各セッションの一意な識別子
- **作成者トークン**: 管理者認証用の秘密トークン

### 2.2 参加者管理
- **参加者の追加/削除**: 管理者が参加者リストを管理可能
- **固定参加者**: 固定メンバーはローテーションから除外（例：ホスト/主）
- **ドラッグ&ドロップによる並び替え**: react-beautiful-dndを使用した直感的なリスト管理
  - 固定参加者はドラッグ不可
  - リスト間移動（パーティー ⇔ 待機列）のバリデーション付き

### 2.3 ローテーションシステム
- **次回ローテーションプレビュー**: 次に参加/退出する人を表示
- **交代人数の設定**: デフォルトは1人、管理設定で調整可能
- **アトミックなローテーション実行**: サーバーサイドRPCで一貫した状態を保証

### 2.4 登録モード
- **無効**: 閲覧者からの登録を受け付けない
- **自由参加**: 閲覧者が自由に待機列に参加可能
- **承認制**: 閲覧者が参加申請を送信し、管理者が承認/却下

### 2.5 リアルタイム同期
- **Supabase Realtime**: WebSocketサブスクリプションで全閲覧者に即時更新
- **接続状態バナー**: 接続状態（接続中、再接続中、エラー）の視覚的インジケーター
- **スケルトンローディング**: データ読み込み中のプレースホルダーUI

### 2.6 YouTube Live連携
- **ライブチャット監視**: YouTube Liveのチャットをポーリングしてトリガーキーワードを検出
- **自動登録**: キーワード検出時にコメント投稿者を自動的にパーティー/待機列に追加
- **キーワード設定可能**: デフォルトは`!参加`、セッションごとにカスタマイズ可能
- **登録モード連携**: セッションの登録モード（自由参加/承認制/無効）に従って処理
- **接続状態表示**: 配信への接続状態と処理済みメッセージ数を表示

## 3. アーキテクチャ

### 3.1 フロントエンド構成

```
src/
├── atlaskit-forms.tsx      # React Islandsのメインエントリーポイント
├── types.ts                # TypeScript型定義
├── components/
│   ├── SetupForm.tsx       # 初期セッション設定フォーム
│   ├── ManagementSettings.tsx  # 管理者設定パネル
│   ├── DndManager.tsx      # ドラッグ&ドロップ管理コンポーネント
│   ├── YouTubeSettings.tsx # YouTube Live連携設定
│   └── ModernDashboard.tsx # モダンUIバリアント
├── utils/
│   ├── mount.ts            # React Islandマウントユーティリティ
│   ├── legacy.ts           # レガシーDOM連携ユーティリティ
│   └── youtube.ts          # YouTube APIユーティリティ
└── styles/                 # CSSスタイル
```

### 3.2 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンドベース | バニラHTML/CSS/JavaScript |
| React Islands | React 18、Atlaskitコンポーネント |
| ドラッグ&ドロップ | react-beautiful-dnd |
| バックエンド/データベース | Supabase（PostgreSQL） |
| リアルタイム | Supabase Realtime |
| ビルドツール | Vite（IIFEバンドル） |
| デプロイ | Vercel |

### 3.3 ビルドプロセス

1. **環境設定** (`build.js`):
   - 環境変数から`SUPABASE_URL`と`SUPABASE_ANON_KEY`を読み込み
   - 設定を埋め込んだ`public/config.js`を生成
   - `public/index.html`に設定を注入

2. **Viteビルド** (`vite.config.ts`):
   - React IslandsをIIFEとしてバンドル
   - 出力先: `public/assets/atlaskit-forms.iife.js`
   - ターゲット: ES2018

## 4. データベーススキーマ

### 4.1 テーブル

#### `sessions`
| カラム | 型 | 説明 |
|--------|------|------|
| id | UUID | 主キー |
| session_code | TEXT | 一意なセッション識別子 |
| master_name | TEXT | セッションホストの名前 |
| party_size | INT | パーティー最大人数（2-10） |
| rotation_count | INT | 1サイクルあたりの交代人数（デフォルト: 1） |
| creator_token | TEXT | 管理者認証トークン |
| approval_required | BOOLEAN | レガシーフラグ（非推奨） |
| registration_mode | TEXT | 'disabled'、'direct'、または'approval' |
| youtube_video_id | TEXT | YouTube Live動画ID |
| youtube_chat_id | TEXT | ポーリング用のYouTube LiveチャットID |
| youtube_keyword | TEXT | トリガーキーワード（デフォルト: '!参加'） |
| youtube_enabled | BOOLEAN | YouTube連携が有効かどうか |
| updated_at | TIMESTAMP | 最終更新タイムスタンプ |

#### `session_users`
| カラム | 型 | 説明 |
|--------|------|------|
| id | UUID | 主キー |
| session_id | UUID | sessionsへの外部キー |
| user_id | INT | アプリケーションレベルのユーザーID |
| name | TEXT | 参加者名 |
| position | TEXT | 'party'または'queue' |
| order_index | INT | リスト内の位置 |
| is_fixed | BOOLEAN | ローテーションから除外するかどうか |
| created_at | TIMESTAMP | 作成タイムスタンプ |

#### `pending_registrations`
| カラム | 型 | 説明 |
|--------|------|------|
| id | UUID | 主キー |
| session_id | UUID | sessionsへの外部キー |
| name | TEXT | 申請者名 |
| status | TEXT | 'pending'、'approved'、または'rejected' |
| requested_at | TIMESTAMP | 申請タイムスタンプ |
| approved_at | TIMESTAMP | 承認タイムスタンプ（nullable） |

### 4.2 リモートプロシージャコール（RPC）

#### `rotate_session(p_session_code, p_creator_token)`
アドバイザリロックを使用したアトミックなローテーションを実行:
1. 作成者トークンを検証
2. ローテーション対象メンバー（固定でないパーティーメンバー）を特定
3. 指定人数をパーティー末尾から待機列へ移動
4. 同数を待機列先頭からパーティーへ移動
5. `order_index`値を正規化
6. 移動したユーザーIDの配列を返却

#### `sync_session_snapshot(p_session_code, p_creator_token, p_party, p_queue, ...)`
フロントエンドの状態をデータベースに同期:
1. 作成者トークンを検証
2. 受信したパーティー/待機列データでUPSERTを実行
3. 削除された参加者を削除
4. `order_index`値を正規化
5. オプションでセッション設定を更新

## 5. ユーザーインターフェース

### 5.1 セットアップ画面
- 主ユーザー名入力（省略可、デフォルトは「主」）
- パーティー人数選択（2-10人）
- 登録モードチェックボックス（承認が必要）
- 「セッション開始」ボタン

### 5.2 管理画面（管理者）

**統計ダッシュボード**:
- パーティー参加者数
- 待機列待機者数
- 総参加者数

**コントロール**:
- ユーザー追加入力とボタン
- 「次へ」ボタン（ローテーション実行）
- 「オーバーレイを開く」ボタン（配信用オーバーレイウィンドウ）
- 「セッションリセット」ボタン

**設定パネル**:
- パーティー人数調整
- 交代人数調整
- 登録モード選択

**参加者リスト**（ドラッグ&ドロップ有効）:
- パーティーメンバー（固定/固定解除、削除アクション付き）
- 待機列メンバー（削除アクション付き）
- 視覚的インジケーター: 「固定」「次に退出」「次に参加」

**URL共有**:
- 閲覧専用URL（公開共有可能）
- 管理者URL（折りたたみ式、警告メッセージ付き）

### 5.3 閲覧画面
- リアルタイム接続状態バナー
- 統計ダッシュボード（読み取り専用）
- 自己登録フォーム（有効時）
- 参加者リスト（読み取り専用）

### 5.4 配信用オーバーレイ
- OBS/配信連携用の別ウィンドウ
- セクション非表示可能な透明背景
- メインアプリケーションとのリアルタイム同期

## 6. URL構造

| URLパターン | 説明 |
|-------------|------|
| `/?code=<session_code>` | 閲覧専用アクセス |
| `/?code=<session_code>&creator=<token>` | 管理者アクセス |

## 7. 状態管理

### 7.1 アプリケーション状態 (`appState`)
```javascript
{
  sessionCode: string,
  sessionId: string,
  partySize: number,           // 2-10
  rotationCount: number,       // 1-3
  party: User[],               // { id, name, isFixed }
  queue: User[],               // { id, name }
  isCreator: boolean,
  userIdCounter: number,
  registrationMode: 'disabled' | 'direct' | 'approval',
  pendingRegistrations: [],
  creatorToken: string,
  isRotating: boolean          // 同時ローテーション防止
}
```

### 7.2 React Islandsとの連携
- `window.getAppState()`: 現在のアプリケーション状態を返却
- `window.applyDnD(newParty, newQueue)`: ドラッグ&ドロップの変更を適用
- `window.refreshDnd()`: 現在の状態でDnDコンポーネントを更新
- `window.toggleUserFixed(userId)`: 固定状態を切り替え
- `window.removeUser(userId, isParty)`: ユーザーを削除

## 8. リアルタイムサブスクリプション

アプリケーションは以下をサブスクライブ:
1. `session_users`テーブル: パーティー/待機列メンバーの変更
2. `sessions`テーブル: セッション設定の変更
3. `pending_registrations`テーブル: 参加申請の変更

処理される接続状態:
- `SUBSCRIBED`: 接続中で更新を受信中
- `CHANNEL_ERROR`: エラー状態（自動再接続あり）
- `CLOSED`/`TIMED_OUT`: 切断状態

## 9. テーマ

### 9.1 デザイントークン（CSS変数）
```css
--ads-color-text: #172B4D;
--ads-color-surface: #FFFFFF;
--ads-color-surface-subtle: #F4F5F7;
--ads-color-border: #DFE1E6;
--ads-color-success: #36B37E;
--ads-color-danger: #FF5630;
--ads-color-warning: #FFAB00;
--ads-color-info: #2684FF;
--ads-elevation-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
--ads-radius: 10px;
```

### 9.2 ビジュアルスタイル
- 背景: `base.png`を参考にした多層グラデーション
- カード: 高透過白＋ブラー＋ソフトシャドウ
- ヘッダー: 白背景＋ダークテキスト
- ボタン: ホバーエフェクト付きパープルグラデーション

## 10. 国際化

現在は日本語のみ、i18nスキャフォールディングあり:
```javascript
const MESSAGES = {
  ja: {
    viewer_hint: 'このセッションは閲覧専用です...',
    conn_ok: 'リアルタイム接続中',
    // ... その他のメッセージ
  }
};
```

## 11. エラーハンドリング

### 11.1 一般的なエラーシナリオ
- 環境変数の欠落/無効
- セッションが見つからない
- 無効な作成者トークン
- データベース接続エラー
- リアルタイムサブスクリプションの失敗

### 11.2 ユーザーフィードバック
- フラグ通知（トースト風）で成功/エラーメッセージ
- 接続状態バナーでリアルタイム状態表示
- 非同期操作中のローディングスピナー

## 12. デプロイ

### 12.1 環境変数（Vercel）
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
YOUTUBE_API_KEY=your_youtube_data_api_key  # オプション、YouTube Live連携用
```

### 12.2 ビルドコマンド
```bash
pnpm install
pnpm run build     # node build.js && vite build
```

### 12.3 Vercel設定 (`vercel.json`)
- ビルドコマンド: `pnpm run build`
- 出力ディレクトリ: `public/`

## 13. セキュリティ考慮事項

1. **作成者トークン**: 管理者操作には有効な作成者トークンが必要
2. **RLS（行レベルセキュリティ）**: データベースレベルのアクセス制御
3. **SECURITY DEFINER RPC**: 制限されたsearch_pathでRLSをバイパス
4. **アドバイザリロック**: ローテーション/同期時の競合状態を防止
5. **URL分離**: 管理者URLは秘密にする必要あり

## 14. 将来の検討事項

- 多言語対応（i18nインフラは存在）
- 追加UIテーマ
- ローテーション履歴の追跡
- セッションデータのエクスポート/インポート
- モバイル最適化ビュー

## 15. ライセンス

MIT License

## 16. リポジトリ

GitHub: https://github.com/beniyasan/queue-management-app
