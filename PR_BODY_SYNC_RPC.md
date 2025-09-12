## 概要
- 根本対策として、保存の「全削除→全挿入」を廃止し、DB側でトランザクション＋アドバイザリロックのもと差分適用（UPSERT＋削除）するRPCを追加しました。
- 整合性・性能向上のため、`session_users` にユニーク制約と索引を追加しました。
- フロントは保存処理を新RPCに切り替え、交代処理前に保存完了を待つことで競合ウィンドウを縮小しています。

## 変更点
### DB（SQLマイグレーション）
1. `database/migrations/20250912_add_constraints_and_indexes.sql`
   - 重複行の事前除去（(session_id, user_id)）
   - `(session_id, position)` ごとの `order_index` 正規化（0..N-1）
   - ユニーク制約の追加：
     - `uq_session_users_session_user (session_id, user_id)`
     - `uq_session_users_order (session_id, position, order_index)`
   - インデックスの追加：
     - `(session_id, position)`、`(session_id, position, order_index)`

2. `database/migrations/20250912_add_sync_session_snapshot_rpc.sql`
   - 新規関数 `public.sync_session_snapshot(p_session_code, p_creator_token, p_party jsonb, p_queue jsonb, p_party_size int, p_rotation_count int)`
   - SECURITY DEFINER + `search_path='public'`、`pg_advisory_lock(hashtext(session_code))` による直列化
   - party/queue を UPSERT→非該当 DELETE→order_index 正規化→（任意で）設定更新

### フロント
- `public/index.html`
  - `saveUsersToSupabase()` を `supabase.rpc('sync_session_snapshot', {...})` 呼び出しに置換
  - 直列化・合流ロジック（保存キュー）を維持
  - `nextRotation()` 実行前に保存完了を待機して、保存と交代の競合を回避

## ねらい / 背景
- 先行実装では保存中に「次へ」を押すと、RPCが空に近いスナップショットを参照し、見かけ上無反応になるケースがありました。
- 保存をDB側で原子的に差分適用し、交代と同じロックキーで直列化することで、一貫性と体感の安定を向上します。

## 適用手順
1. Supabaseで以下を順に適用
   - `database/migrations/20250912_add_constraints_and_indexes.sql`
   - `database/migrations/20250912_add_sync_session_snapshot_rpc.sql`
2. デプロイ後、動作確認

## 動作確認
- DnD/追加/削除/固定切替/人数変更の直後に「次へ」を押しても無反応にならない
- 重複行が発生しない（(session_id, user_id)）
- 順序が常に 0..N-1 に正規化される
- 交代・保存が同時でも最終状態が一貫（アドバイザリロック）

## リスク/ロールバック
- 既存データに重複がある場合、マイグレーションの重複除去ロジックで解消済み
- 問題時は関数/制約のロールバックと、フロントを旧保存方式に戻すことで復旧可能

