-- Migration: Add YouTube Live integration columns to sessions table

BEGIN;

-- Add YouTube integration columns
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS youtube_video_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS youtube_chat_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS youtube_keyword TEXT DEFAULT '!参加',
ADD COLUMN IF NOT EXISTS youtube_enabled BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups when YouTube is enabled
CREATE INDEX IF NOT EXISTS idx_sessions_youtube_enabled 
ON public.sessions (youtube_enabled) 
WHERE youtube_enabled = TRUE;

COMMENT ON COLUMN public.sessions.youtube_video_id IS 'YouTube Live video ID extracted from URL';
COMMENT ON COLUMN public.sessions.youtube_chat_id IS 'YouTube Live chat ID for polling messages';
COMMENT ON COLUMN public.sessions.youtube_keyword IS 'Trigger keyword for auto-registration (e.g., !参加)';
COMMENT ON COLUMN public.sessions.youtube_enabled IS 'Whether YouTube Live integration is active';

COMMIT;
