-- Resequence existing order_index deterministically across all sessions
-- Ensures no ambiguous ties remain prior to new deterministic rotation logic

BEGIN;

-- Normalize party ordering per session
WITH ranked_party AS (
  SELECT su.session_id, su.user_id,
         ROW_NUMBER() OVER (
           PARTITION BY su.session_id, su.position
           ORDER BY su.order_index, su.created_at, su.user_id
         ) - 1 AS rn
  FROM public.session_users su
  WHERE su.position = 'party'
)
UPDATE public.session_users su
SET order_index = rp.rn
FROM ranked_party rp
WHERE su.session_id = rp.session_id
  AND su.user_id = rp.user_id
  AND su.position = 'party';

-- Normalize queue ordering per session
WITH ranked_queue AS (
  SELECT su.session_id, su.user_id,
         ROW_NUMBER() OVER (
           PARTITION BY su.session_id, su.position
           ORDER BY su.order_index, su.created_at, su.user_id
         ) - 1 AS rn
  FROM public.session_users su
  WHERE su.position = 'queue'
)
UPDATE public.session_users su
SET order_index = rq.rn
FROM ranked_queue rq
WHERE su.session_id = rq.session_id
  AND su.user_id = rq.user_id
  AND su.position = 'queue';

COMMIT;
