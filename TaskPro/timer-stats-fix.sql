-- ===== TASKPRO TIMER_STATS FIX =====
-- Fix timer_stats table structure to match code expectations
-- Run this in Supabase SQL Editor

-- Recreate timer_stats table with correct structure
DROP TABLE IF EXISTS public.timer_stats CASCADE;

CREATE TABLE public.timer_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_focus_time INTEGER DEFAULT 0,
    total_break_time INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_session_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.timer_stats ENABLE ROW LEVEL SECURITY;

-- Allow users to see and update their own stats
DROP POLICY IF EXISTS "Users can view own timer stats" ON public.timer_stats;
CREATE POLICY "Users can view own timer stats" ON public.timer_stats
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own timer stats" ON public.timer_stats;
CREATE POLICY "Users can update own timer stats" ON public.timer_stats
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own timer stats" ON public.timer_stats;
CREATE POLICY "Users can insert own timer stats" ON public.timer_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable real-time for timer_stats
ALTER PUBLICATION supabase_realtime ADD TABLE timer_stats;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_timer_stats_user_id ON public.timer_stats(user_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'TaskPro timer_stats table fixed!';
    RAISE NOTICE '✅ Table structure updated to match code expectations';
    RAISE NOTICE '✅ Row Level Security enabled';
    RAISE NOTICE '✅ Real-time publication enabled';
    RAISE NOTICE '🚀 400 Bad Request errors should now be resolved!';
END $$;
