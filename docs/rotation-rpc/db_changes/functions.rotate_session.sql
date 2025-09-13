-- 回転処理をDBで原子的に行うRPC
-- 実行者: 管理者（creator_token検証）
-- 排他: セッションコードをキーにアドバイザリロック

CREATE OR REPLACE FUNCTION rotate_session(p_session_code text, p_creator_token text)
RETURNS TABLE(moved_in int[], moved_out int[]) AS $$
DECLARE
    v_session RECORD;
    v_key BIGINT;
    v_rotation_amount INT;
    v_available_replacements INT;
    v_moved_in INT[] := ARRAY[]::INT[];
    v_moved_out INT[] := ARRAY[]::INT[];
BEGIN
    SELECT id, party_size, rotation_count, creator_token
      INTO v_session
      FROM sessions
     WHERE session_code = p_session_code;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'session not found';
    END IF;

    IF v_session.creator_token IS NULL OR v_session.creator_token <> p_creator_token THEN
        RAISE EXCEPTION 'invalid token';
    END IF;

    v_key := hashtext(p_session_code)::BIGINT;
    PERFORM pg_advisory_lock(v_key);

    BEGIN
        -- 回転数と交代可能人数を計算
        WITH rotatable AS (
            SELECT user_id
              FROM session_users
             WHERE session_id = v_session.id
               AND position = 'party'
               AND COALESCE(is_fixed, false) = false
             ORDER BY order_index, created_at, user_id
        ), q AS (
            SELECT user_id
              FROM session_users
             WHERE session_id = v_session.id
               AND position = 'queue'
             ORDER BY order_index, created_at, user_id
        )
        SELECT LEAST(v_session.rotation_count, (SELECT COUNT(*) FROM rotatable)) AS rotation_amount,
               LEAST((SELECT COUNT(*) FROM q),
                     LEAST(v_session.rotation_count, (SELECT COUNT(*) FROM rotatable))) AS available_replacements
          INTO v_rotation_amount, v_available_replacements;

        IF v_available_replacements > 0 THEN
            -- 抜け/入れ どちらも事前スナップショットの順序で確定し、更新時に反映
            WITH to_leave AS (
                SELECT user_id, ROW_NUMBER() OVER (ORDER BY order_index, created_at, user_id) AS rn
                  FROM session_users
                 WHERE session_id = v_session.id
                   AND position = 'party'
                   AND COALESCE(is_fixed, false) = false
                 ORDER BY order_index, created_at, user_id
                 LIMIT v_available_replacements
            ), to_join AS (
                SELECT user_id, ROW_NUMBER() OVER (ORDER BY order_index, created_at, user_id) AS rn
                  FROM session_users
                 WHERE session_id = v_session.id
                   AND position = 'queue'
                 ORDER BY order_index, created_at, user_id
                 LIMIT v_available_replacements
            ), queue_base AS (
                SELECT COALESCE(MAX(order_index)+1,0) AS base
                  FROM session_users
                 WHERE session_id = v_session.id AND position = 'queue'
            ), moved_leave AS (
                UPDATE session_users su
                   SET position = 'queue',
                       order_index = (SELECT base FROM queue_base) + tl.rn - 1
                  FROM to_leave tl
                 WHERE su.session_id = v_session.id
                   AND su.user_id = tl.user_id
                 RETURNING su.user_id, tl.rn
            ), party_base AS (
                SELECT COALESCE(MAX(order_index)+1,0) AS base
                  FROM session_users
                 WHERE session_id = v_session.id AND position = 'party'
            ), moved_join AS (
                UPDATE session_users su
                   SET position = 'party',
                       order_index = (SELECT base FROM party_base) + tj.rn - 1
                  FROM to_join tj
                 WHERE su.session_id = v_session.id
                   AND su.user_id = tj.user_id
                 RETURNING su.user_id, tj.rn
            )
            SELECT COALESCE(array_agg(mj.user_id ORDER BY mj.rn), ARRAY[]::INT[]),
                   COALESCE(array_agg(ml.user_id ORDER BY ml.rn), ARRAY[]::INT[])
              INTO v_moved_in, v_moved_out
              FROM moved_join mj FULL OUTER JOIN moved_leave ml ON FALSE;
        END IF;

        -- 不足補充（party_sizeまでqueue先頭から補充）
        WITH party_count AS (
            SELECT COUNT(*) AS c
              FROM session_users
             WHERE session_id = v_session.id AND position = 'party'
        ), shortage AS (
            SELECT GREATEST(0, v_session.party_size - c) AS need FROM party_count
        ), extra AS (
            SELECT user_id, ROW_NUMBER() OVER (ORDER BY order_index, created_at, user_id) AS rn
              FROM session_users
             WHERE session_id = v_session.id AND position = 'queue'
             ORDER BY order_index, created_at, user_id
             LIMIT (SELECT need FROM shortage)
        ), party_base AS (
            SELECT COALESCE(MAX(order_index)+1,0) AS base
              FROM session_users
             WHERE session_id = v_session.id AND position = 'party'
        )
        UPDATE session_users su
           SET position = 'party',
               order_index = (SELECT base FROM party_base) + e.rn - 1
          FROM extra e
         WHERE su.session_id = v_session.id AND su.user_id = e.user_id;

        -- order_index を 0..N-1 に正規化（party）
        WITH ranked_party AS (
            SELECT user_id, ROW_NUMBER() OVER (ORDER BY order_index, created_at, user_id) - 1 AS rn
              FROM session_users
             WHERE session_id = v_session.id AND position = 'party'
             ORDER BY order_index, created_at, user_id
        )
        UPDATE session_users su
           SET order_index = rp.rn
          FROM ranked_party rp
         WHERE su.session_id = v_session.id AND su.position = 'party' AND su.user_id = rp.user_id;

        -- order_index を 0..N-1 に正規化（queue）
        WITH ranked_queue AS (
            SELECT user_id, ROW_NUMBER() OVER (ORDER BY order_index, created_at, user_id) - 1 AS rn
              FROM session_users
             WHERE session_id = v_session.id AND position = 'queue'
             ORDER BY order_index, created_at, user_id
        )
        UPDATE session_users su
           SET order_index = rq.rn
          FROM ranked_queue rq
         WHERE su.session_id = v_session.id AND su.position = 'queue' AND su.user_id = rq.user_id;

    EXCEPTION WHEN OTHERS THEN
        PERFORM pg_advisory_unlock(v_key);
        RAISE;
    END;

    PERFORM pg_advisory_unlock(v_key);
    RETURN QUERY SELECT v_moved_in, v_moved_out;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 実行権限（必要に応じて調整）
GRANT EXECUTE ON FUNCTION rotate_session(text, text) TO anon, authenticated;
