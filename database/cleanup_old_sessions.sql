-- 24時間を超過した古いセッションデータを削除するSQL関数

-- 削除処理を実行する関数
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS TABLE(
    deleted_sessions INTEGER,
    deleted_users INTEGER,
    cleanup_timestamp TIMESTAMP
) AS $$
DECLARE
    session_count INTEGER := 0;
    user_count INTEGER := 0;
BEGIN
    -- 24時間を超過したセッションのユーザーを先に削除
    WITH old_sessions AS (
        SELECT id FROM sessions 
        WHERE created_at < NOW() - INTERVAL '24 hours'
    )
    DELETE FROM session_users 
    WHERE session_id IN (SELECT id FROM old_sessions);
    
    GET DIAGNOSTICS user_count = ROW_COUNT;
    
    -- 24時間を超過したセッションを削除
    DELETE FROM sessions 
    WHERE created_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS session_count = ROW_COUNT;
    
    -- ログ出力用のクリーンアップ情報をテーブルに記録
    INSERT INTO cleanup_logs (
        deleted_sessions, 
        deleted_users, 
        cleanup_timestamp
    ) VALUES (
        session_count,
        user_count,
        NOW()
    );
    
    -- 結果を返す
    RETURN QUERY SELECT 
        session_count as deleted_sessions,
        user_count as deleted_users,
        NOW() as cleanup_timestamp;
END;
$$ LANGUAGE plpgsql;

-- クリーンアップログテーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id SERIAL PRIMARY KEY,
    deleted_sessions INTEGER NOT NULL DEFAULT 0,
    deleted_users INTEGER NOT NULL DEFAULT 0,
    cleanup_timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- クリーンアップログも7日間で削除する関数
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
    log_count INTEGER := 0;
BEGIN
    DELETE FROM cleanup_logs 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS log_count = ROW_COUNT;
    
    RETURN log_count;
END;
$$ LANGUAGE plpgsql;

-- 手動実行用のコメント例
-- SELECT * FROM cleanup_old_sessions();
-- SELECT * FROM cleanup_old_logs();