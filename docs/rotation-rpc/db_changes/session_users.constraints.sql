-- 推奨ユニーク制約（存在しない場合のみ追加）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'session_users' AND c.conname = 'session_users_unique'
    ) THEN
        ALTER TABLE session_users
        ADD CONSTRAINT session_users_unique UNIQUE (session_id, user_id);
    END IF;
END $$;

