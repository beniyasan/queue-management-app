-- Ensure uniqueness and performance on session_users
-- 1) Deduplicate (session_id, user_id) if any accidental duplicates exist
WITH dups AS (
  SELECT a.id
  FROM public.session_users a
  JOIN public.session_users b
    ON a.session_id = b.session_id
   AND a.user_id = b.user_id
   AND a.id > b.id
)
DELETE FROM public.session_users su
USING dups d
WHERE su.id = d.id;

-- 2) Normalize order_index per (session_id, position) to be 0..N-1
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY session_id, position ORDER BY order_index, created_at, id) - 1 AS rn
  FROM public.session_users
)
UPDATE public.session_users su
SET order_index = r.rn
FROM ranked r
WHERE su.id = r.id;

-- 3) Add unique constraints and indexes
ALTER TABLE public.session_users
  ADD CONSTRAINT uq_session_users_session_user UNIQUE (session_id, user_id);

ALTER TABLE public.session_users
  ADD CONSTRAINT uq_session_users_order UNIQUE (session_id, position, order_index);

CREATE INDEX IF NOT EXISTS idx_session_users_session_position
  ON public.session_users (session_id, position);

CREATE INDEX IF NOT EXISTS idx_session_users_session_position_order
  ON public.session_users (session_id, position, order_index);

