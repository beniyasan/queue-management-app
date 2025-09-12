-- Create RPC to atomically sync party/queue snapshot with UPSERT + delete
-- Security: SECURITY DEFINER to bypass RLS; restrict search_path
CREATE OR REPLACE FUNCTION public.sync_session_snapshot(
  p_session_code text,
  p_creator_token text,
  p_party jsonb,
  p_queue jsonb,
  p_party_size int DEFAULT NULL,
  p_rotation_count int DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session RECORD;
  v_key BIGINT;
BEGIN
  -- Lookup session and validate token
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
    -- Materialize incoming snapshot
    WITH party_incoming AS (
      SELECT 
        COALESCE((rec).user_id, 0)::int AS user_id,
        COALESCE((rec).name, '')::text AS name,
        COALESCE((rec).is_fixed, false)::boolean AS is_fixed,
        ROW_NUMBER() OVER () - 1 AS order_index,
        'party'::text AS position
      FROM (
        SELECT jsonb_to_recordset(COALESCE(p_party, '[]'::jsonb)) AS rec(user_id int, name text, is_fixed boolean)
      ) t
    ), queue_incoming AS (
      SELECT 
        COALESCE((rec).user_id, 0)::int AS user_id,
        COALESCE((rec).name, '')::text AS name,
        false AS is_fixed,
        ROW_NUMBER() OVER () - 1 AS order_index,
        'queue'::text AS position
      FROM (
        SELECT jsonb_to_recordset(COALESCE(p_queue, '[]'::jsonb)) AS rec(user_id int, name text)
      ) t
    ), incoming AS (
      SELECT * FROM party_incoming
      UNION ALL
      SELECT * FROM queue_incoming
    )
    -- Upsert
    INSERT INTO public.session_users (session_id, user_id, name, position, order_index, is_fixed)
    SELECT v_session.id, i.user_id, i.name, i.position, i.order_index, i.is_fixed
    FROM incoming i
    ON CONFLICT (session_id, user_id) DO UPDATE
      SET name = EXCLUDED.name,
          position = EXCLUDED.position,
          order_index = EXCLUDED.order_index,
          is_fixed = EXCLUDED.is_fixed;

    -- Delete rows not present in incoming
    DELETE FROM public.session_users su
    WHERE su.session_id = v_session.id
      AND NOT EXISTS (
        SELECT 1 FROM (
          SELECT user_id FROM (
            SELECT user_id FROM party_incoming
            UNION ALL
            SELECT user_id FROM queue_incoming
          ) u
        ) x WHERE x.user_id = su.user_id
      );

    -- Normalize order_index (party)
    WITH ranked_party AS (
      SELECT user_id, ROW_NUMBER() OVER (ORDER BY order_index, created_at, id) - 1 AS rn
      FROM public.session_users
      WHERE session_id = v_session.id AND position = 'party'
    )
    UPDATE public.session_users su
       SET order_index = rp.rn
      FROM ranked_party rp
     WHERE su.session_id = v_session.id AND su.position = 'party' AND su.user_id = rp.user_id;

    -- Normalize order_index (queue)
    WITH ranked_queue AS (
      SELECT user_id, ROW_NUMBER() OVER (ORDER BY order_index, created_at, id) - 1 AS rn
      FROM public.session_users
      WHERE session_id = v_session.id AND position = 'queue'
    )
    UPDATE public.session_users su
       SET order_index = rq.rn
      FROM ranked_queue rq
     WHERE su.session_id = v_session.id AND su.position = 'queue' AND su.user_id = rq.user_id;

    -- Optionally update session settings
    IF p_party_size IS NOT NULL OR p_rotation_count IS NOT NULL THEN
      UPDATE public.sessions s
         SET party_size = COALESCE(p_party_size, s.party_size),
             rotation_count = COALESCE(p_rotation_count, s.rotation_count),
             updated_at = now()
       WHERE s.id = v_session.id;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(v_key);
    RAISE;
  END;
  PERFORM pg_advisory_unlock(v_key);
END;
$$;

