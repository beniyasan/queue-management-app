-- 推奨インデックス（存在しない場合のみ追加）
CREATE INDEX IF NOT EXISTS idx_session_users_pos
  ON session_users(session_id, position, order_index);

CREATE INDEX IF NOT EXISTS idx_session_users_user
  ON session_users(session_id, user_id);

