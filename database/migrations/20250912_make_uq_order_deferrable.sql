-- Recreate order uniqueness constraint as DEFERRABLE to avoid transient conflicts during UPSERT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public' AND rel.relname = 'session_users' AND c.conname = 'uq_session_users_order'
  ) THEN
    ALTER TABLE public.session_users DROP CONSTRAINT uq_session_users_order;
  END IF;
END $$;

ALTER TABLE public.session_users
  ADD CONSTRAINT uq_session_users_order UNIQUE (session_id, "position", order_index) DEFERRABLE INITIALLY DEFERRED;

