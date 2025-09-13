# Queue Party

リアルタイム同期で「パーティー/待機」の並びを管理できる軽量Webアプリ。

管理者は参加者の追加/削除/固定/交代を操作でき、閲覧者はリアルタイムに状況を確認できます。UIは Atlassian Design System を参考にしつつ、React Islands（Atlaskit）で段階的に強化しています。

## 機能ハイライト
- セッション作成/共有（管理者URLと閲覧URLの分離）
- 参加者の追加・削除・固定（固定は交代対象外）
- DnD（react-beautiful-dnd）で並び替え・列移動（固定のドラッグは無効）
- 次交代プレビュー（次に参加/退出）と交代実行（デフォルト1名、管理で変更可）
- 承認制の参加申請（保留/承認/却下）
- Realtime（Supabase）で閲覧者へ即時反映、接続バナー/スケルトン表示

## アーキテクチャ
- フロントエンド
  - `public/index.html`（静的ベース + JS）
  - React Islands: `src/atlaskit-forms.tsx`（Viteで IIFE ビルド → `public/assets/atlaskit-forms.iife.js`）
  - DnD: `react-beautiful-dnd`
- データベース（Supabase/Postgres）
  - テーブル: `sessions`, `session_users`, `pending_registrations`
  - RPC: `rotate_session(p_session_code, p_creator_token)`, `sync_session_snapshot(p_session_code, p_creator_token, p_party jsonb, p_queue jsonb, ...)`
  - Realtime: `session_users`/`sessions`/`pending_registrations` を購読して再描画

## セットアップ
### 必要要件
- Node.js / pnpm
- Supabase プロジェクト

### 環境変数（Vercel など）
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### ビルド/開発
```
pnpm install
pnpm run build     # node build.js && vite build → public/assets に出力
pnpm dev           # （任意）Vite開発サーバ
```

build.js が `public/config.js` を生成し、`window.APP_CONFIG` に Supabase 設定を埋め込みます。IIFE バンドルは Islands（Atlaskitフォーム/DnD）を初期化します。

### デプロイ
- Vercel: `vercel.json` で `pnpm run build` → `public/` を配信
- 画像アイコン: `public/assets/queue-party-icon.png`（未配置時は `gameicon.png` へフォールバック）

## 使い方
### セッション開始（管理者）
1. 初回画面で「主ユーザー名（任意）」と「パーティー人数」を設定
2. 交代人数は初期値1（管理画面で変更可）
3. 「セッション開始」を押すと管理画面に遷移

### 管理画面
- 参加者追加/削除、固定/固定解除
- DnD でパーティー/待機の並び替え・列移動（固定のドラッグは無効）
- 「次へ」で交代を実行（固定を除外し、先頭から指定人数を交代）
- 設定でパーティー人数/交代人数/参加モード（無効/自由/承認）を変更

### 閲覧画面
- リアルタイムでパーティー/待機の状況を確認
- 接続状態バナーとスケルトンで状態を可視化

## Supabase モデル（概要）
```
sessions(id, session_code, master_name, party_size, rotation_count, creator_token, updated_at, ...)
session_users(id, session_id, user_id, name, position['party'|'queue'], order_index, is_fixed, created_at)
pending_registrations(id, session_id, name, status['pending'|'approved'|'rejected'], requested_at, approved_at)
```
- RPC `rotate_session` はアドバイザリロックで交代を原子的に処理し、`order_index` を正規化
  - 複数人同時交代時は抽出順に基づく一意の仮インデックスを割当て、正規化時も安定順序（`order_index, user_id`）となるよう調整済み
- RPC `sync_session_snapshot` はフロントのスナップショットを UPSERT＋削除で反映

## テーマ/ブランド
- 背景は base.png を元にした多層グラデーション
- カードは高透過白＋blur＋soft shadow
- ヘッダーは白背景＋ダークテキスト（ブランドアイコンは `public/assets/queue-party-icon.png`）
- index.html 冒頭の CSS 変数（tokens相当）で色/角丸/影/余白を調整可能

## トラブルシュート
- セッション開始で `null.value` エラー → 初回画面から交代人数 UI を削除済、startSession では rotationCount=1 を使用
- `session_code`/`rotation_count` NOT NULL → 保存時に正規化/ガードを実装済
- `t is not defined` → i18n スキャフォールドを取り込み済（M6）。古いビルドなら再ビルド
- 環境変数が反映されない → `pnpm run build` で `public/config.js` を生成できているか確認

## ライセンス
MIT License

## リンク
- GitHub: https://github.com/beniyasan/queue-management-app
- デプロイ: Vercel（環境によりURLは異なります）
