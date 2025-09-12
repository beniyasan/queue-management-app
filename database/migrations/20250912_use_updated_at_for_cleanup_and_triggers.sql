-- Migration: Switch cleanup to updated_at and add touch triggers
-- Applies to: public.cleanup_old_sessions, triggers on session_users and pending_registrations

BEGIN;

-- 1) Cleanup function: use updated_at as inactivity signal
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS TABLE(
    deleted_sessions INTEGER,
    deleted_users INTEGER,
    cleanup_timestamp TIMESTAMP
) AS $$
DECLARE
    session_count INTEGER := 0;
    user_count INTEGER := 0;
BEGIN
    -- Remove users from sessions inactive for 24 hours
    WITH old_sessions AS (
        SELECT id FROM public.sessions
        WHERE updated_at < NOW() - INTERVAL '24 hours'
    )
    DELETE FROM public.session_users 
    WHERE session_id IN (SELECT id FROM old_sessions);

    GET DIAGNOSTICS user_count = ROW_COUNT;

    -- Remove pending registrations tied to those sessions
    WITH old_sessions AS (
        SELECT id FROM public.sessions
        WHERE updated_at < NOW() - INTERVAL '24 hours'
    )
    DELETE FROM public.pending_registrations 
    WHERE session_id IN (SELECT id FROM old_sessions);

    -- Finally delete the sessions themselves
    DELETE FROM public.sessions 
    WHERE updated_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS session_count = ROW_COUNT;

    -- Log summary (pending count omitted by design for backward compatibility)
    INSERT INTO public.cleanup_logs (
        deleted_sessions, 
        deleted_users, 
        cleanup_timestamp
    ) VALUES (
        session_count,
        user_count,
        NOW()
    );

    RETURN QUERY SELECT 
        session_count as deleted_sessions,
        user_count as deleted_users,
        NOW() as cleanup_timestamp;
END;
$$ LANGUAGE plpgsql;

-- 2) Touch triggers: keep sessions.updated_at fresh on related activity
CREATE OR REPLACE FUNCTION public.touch_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_session_id := OLD.session_id;
  ELSE
    v_session_id := NEW.session_id;
  END IF;

  IF v_session_id IS NOT NULL THEN
    UPDATE public.sessions
      SET updated_at = NOW()
    WHERE id = v_session_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Ensure owner is postgres to bypass RLS constraints when touching sessions
ALTER FUNCTION public.touch_sessions_updated_at() OWNER TO postgres;

-- Recreate triggers
DROP TRIGGER IF EXISTS session_users_touch_updated_at ON public.session_users;
CREATE TRIGGER session_users_touch_updated_at
AFTER INSERT OR UPDATE OR DELETE ON public.session_users
FOR EACH ROW EXECUTE FUNCTION public.touch_sessions_updated_at();

DROP TRIGGER IF EXISTS pending_registrations_touch_updated_at ON public.pending_registrations;
CREATE TRIGGER pending_registrations_touch_updated_at
AFTER INSERT OR UPDATE OR DELETE ON public.pending_registrations
FOR EACH ROW EXECUTE FUNCTION public.touch_sessions_updated_at();

COMMIT;

