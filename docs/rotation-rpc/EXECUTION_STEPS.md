# 実行手順（適用順）

1. DB変更の適用（Supabase SQL エディタ or CLI）
   - `docs/rotation-rpc/db_changes/session_users.constraints.sql`
   - `docs/rotation-rpc/db_changes/session_users.indexes.sql`
   - `docs/rotation-rpc/db_changes/functions.rotate_session.sql`

2. フロント変更の適用（別PR想定）
   - `docs/rotation-rpc/frontend_changes.md` の差分に従い、`nextRotation()` を RPC 呼び出しに置換
   - 実行中は `nextBtn.disabled = true` → finallyで復帰

3. 検証
   - `docs/rotation-rpc/TEST_PLAN.md` に従い、連打/同時実行/回帰の確認

4. ロールバック（必要時）
   - `docs/rotation-rpc/db_changes/rollback.sql` の該当行を実行
   - フロントは旧実装に戻す（直前のデプロイにロールバック）

