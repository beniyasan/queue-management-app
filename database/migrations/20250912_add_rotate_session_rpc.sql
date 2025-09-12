-- Migration: Add rotate_session RPC for atomic server-side rotation

BEGIN;

CREATE OR REPLACE FUNCTION public.rotate_session(p_session_code text, p_creator_token text)
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
      FROM public.sessions
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
        -- Compute rotation counts
        WITH rotatable AS (
            SELECT user_id
              FROM public.session_users
             WHERE session_id = v_session.id
               AND position = 'party'
               AND COALESCE(is_fixed, false) = false
             ORDER BY order_index
        ), q AS (
            SELECT user_id
              FROM public.session_users
             WHERE session_id = v_session.id
               AND position = 'queue'
             ORDER BY order_index
        )
        SELECT LEAST(v_session.rotation_count, (SELECT COUNT(*) FROM rotatable)) AS rotation_amount,
               LEAST((SELECT COUNT(*) FROM q),
                     LEAST(v_session.rotation_count, (SELECT COUNT(*) FROM rotatable))) AS available_replacements
          INTO v_rotation_amount, v_available_replacements;

        IF v_available_replacements > 0 THEN
            -- Move out from party to queue (non-fixed)
            WITH to_leave AS (
                SELECT user_id
                  FROM public.session_users
                 WHERE session_id = v_session.id
                   AND position = 'party'
                   AND COALESCE(is_fixed, false) = false
                 ORDER BY order_index
                 LIMIT v_available_replacements
            ), moved_leave AS (
                UPDATE public.session_users su
                   SET position = 'queue',
                       order_index = (SELECT COALESCE(MAX(order_index)+1,0)
                                        FROM public.session_users
                                       WHERE session_id = v_session.id AND position = 'queue')
                  FROM to_leave tl
                 WHERE su.session_id = v_session.id
                   AND su.user_id = tl.user_id
                 RETURNING su.user_id
            ), to_join AS (
                SELECT user_id
                  FROM public.session_users
                 WHERE session_id = v_session.id
                   AND position = 'queue'
                 ORDER BY order_index
                 LIMIT v_available_replacements
            ), moved_join AS (
                UPDATE public.session_users su
                   SET position = 'party',
                       order_index = (SELECT COALESCE(MAX(order_index)+1,0)
                                        FROM public.session_users
                                       WHERE session_id = v_session.id AND position = 'party')
                  FROM to_join tj
                 WHERE su.session_id = v_session.id
                   AND su.user_id = tj.user_id
                 RETURNING su.user_id
            )
            SELECT COALESCE(array_agg(moved_join.user_id), ARRAY[]::INT[]),
                   COALESCE(array_agg(moved_leave.user_id), ARRAY[]::INT[])
              INTO v_moved_in, v_moved_out
              FROM moved_join FULL OUTER JOIN moved_leave ON FALSE;
        END IF;

        -- Fill shortage to party_size from queue
        WITH party_count AS (
            SELECT COUNT(*) AS c
              FROM public.session_users
             WHERE session_id = v_session.id AND position = 'party'
        ), shortage AS (
            SELECT GREATEST(0, v_session.party_size - c) AS need FROM party_count
        ), extra AS (
            SELECT user_id
              FROM public.session_users
             WHERE session_id = v_session.id AND position = 'queue'
             ORDER BY order_index
             LIMIT (SELECT need FROM shortage)
        )
        UPDATE public.session_users su
           SET position = 'party',
               order_index = (SELECT COALESCE(MAX(order_index)+1,0)
                                FROM public.session_users
                               WHERE session_id = v_session.id AND position = 'party')
          FROM extra e
         WHERE su.session_id = v_session.id AND su.user_id = e.user_id;

        -- Normalize order_index (party)
        WITH ranked_party AS (
            SELECT user_id, ROW_NUMBER() OVER (ORDER BY order_index) - 1 AS rn
              FROM public.session_users
             WHERE session_id = v_session.id AND position = 'party'
             ORDER BY order_index
        )
        UPDATE public.session_users su
           SET order_index = rp.rn
          FROM ranked_party rp
         WHERE su.session_id = v_session.id AND su.position = 'party' AND su.user_id = rp.user_id;

        -- Normalize order_index (queue)
        WITH ranked_queue AS (
            SELECT user_id, ROW_NUMBER() OVER (ORDER BY order_index) - 1 AS rn
              FROM public.session_users
             WHERE session_id = v_session.id AND position = 'queue'
             ORDER BY order_index
        )
        UPDATE public.session_users su
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

GRANT EXECUTE ON FUNCTION public.rotate_session(text, text) TO anon, authenticated;

COMMIT;

