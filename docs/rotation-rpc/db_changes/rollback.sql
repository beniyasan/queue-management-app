-- ロールバック用（必要時のみ実行）
DO $$ BEGIN
    -- 関数削除
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'rotate_session'
    ) THEN
        DROP FUNCTION IF EXISTS rotate_session(text, text);
    END IF;
END $$;

-- インデックス/制約の削除は基本不要だが、戻したい場合のみ実行
-- DROP INDEX IF EXISTS idx_session_users_pos;
-- DROP INDEX IF EXISTS idx_session_users_user;
-- ALTER TABLE session_users DROP CONSTRAINT IF EXISTS session_users_unique;

