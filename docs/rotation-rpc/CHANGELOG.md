# 回転RPC導入 変更概要

目的: 交代（次へ）操作をDB側のトランザクションで原子化し、連打/競合時の不整合を防止します。

- 新規RPC: `rotate_session(p_session_code text, p_creator_token text)`
- 排他: セッションコードに基づくアドバイザリロックで直列化
- ロジック: 既存の交代アルゴリズムに厳密一致（固定除外、交代数、不足補充）
- 並び: 最後に party / queue の `order_index` を 0..N-1 で正規化
- 返却: `moved_in`, `moved_out`（user_id配列）
- 付帯: `session_users` にユニーク制約・推奨インデックスを追加
- フロント: `nextRotation()` を `supabase.rpc('rotate_session', ...)` 呼び出しへ置換（実行中は連打無効）

