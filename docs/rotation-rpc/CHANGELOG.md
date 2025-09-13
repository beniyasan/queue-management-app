# 回転RPC導入 変更概要

目的: 交代（次へ）操作をDB側のトランザクションで原子化し、連打/競合時の不整合を防止します。

- 新規RPC: `rotate_session(p_session_code text, p_creator_token text)`
- 排他: セッションコードに基づくアドバイザリロックで直列化
- ロジック: 既存の交代アルゴリズムに厳密一致（固定除外、交代数、不足補充）
- 並び: 最後に party / queue の `order_index` を 0..N-1 で正規化
- 決定性: 複数人同時交代時に `MAX(order_index)+1` の同値割当で相対順が不定になる問題を解消。
  - `to_leave` / `to_join` / 不足補充の抽出に `ROW_NUMBER()` を付与し、
    更新時は `base + rn - 1` で一意の `order_index` を割当てる方式へ変更
  - 抽出・正規化ともに `ORDER BY order_index, user_id` へ統一し、工程間の順序一貫性を担保
  - 既存データ向けに一括正規化のマイグレーションを追加（`20250913_resequence_existing_order.sql`）
  - フロントの取得順を `.order('position').order('order_index').order('user_id')` に変更
- 返却: `moved_in`, `moved_out`（user_id配列）
- 付帯: `session_users` にユニーク制約・推奨インデックスを追加
- フロント: `nextRotation()` を `supabase.rpc('rotate_session', ...)` 呼び出しへ置換（実行中は連打無効）
