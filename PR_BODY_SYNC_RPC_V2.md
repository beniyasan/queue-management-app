## 概要 (v2)
- 前PRの内容（atomicな `sync_session_snapshot` RPC + 制約/インデックス追加 + フロント保存のRPC化）に加え、実運用で顕在化した問題を修正しました。

## 追加修正
- SQL 関数のCTEスコープ修正
  - DELETE文内で `party_incoming` などCTEを参照しないよう、当該文内で再構築する形に修正。
  - これにより、`relation "party_incoming" does not exist` エラーを解消。
- 順序一意制約のDEFERRED化
  - `(session_id, position, order_index)` のユニーク制約を `DEFERRABLE INITIALLY DEFERRED` で再作成し、UPSERT中の一時重複を許容。

## 変更点（累積）
### DB（SQLマイグレーション）
1. `database/migrations/20250912_add_constraints_and_indexes.sql`
   - 重複除去・order_index 正規化・ユニーク制約・インデックス追加
2. `database/migrations/20250912_add_sync_session_snapshot_rpc.sql`
   - RPC: `public.sync_session_snapshot(...)`（SECURITY DEFINER、search_path固定、advisory lock、UPSERT→DELETE→正規化→設定更新）
   - DELETE時のCTE再構築でスコープ問題を解消（v2修正）
3. `database/migrations/20250912_make_uq_order_deferrable.sql`
   - `(session_id, position, order_index)` ユニーク制約を DEFERRABLE へ変更（v2追加）

### フロント
- `saveUsersToSupabase()` を RPC 版へ切替、保存直列化・合流ロジック維持
- `nextRotation()` 実行前に保存完了を待機して競合を回避

## 適用手順
1. Supabaseで以下を順に適用
   - `database/migrations/20250912_make_uq_order_deferrable.sql`
   - `database/migrations/20250912_add_sync_session_snapshot_rpc.sql`（再適用）
2. デプロイ後、保存→交代の連続操作で挙動確認

## 動作確認
- セッション開始直後を含め、保存エラー（CTE未定義）にならない
- DnD/追加/削除/固定切替/人数変更→「次へ」押下でも無反応にならず、一貫性を維持
- 重複行なし、順序は各ポジションで0..N-1に正規化

## リスク/ロールバック
- 問題時は関数/制約のロールバックと、フロントの旧保存方式への復帰で対応可能

