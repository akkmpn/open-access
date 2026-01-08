-- ===== TASKPRO SAFE REAL-TIME SETUP =====
-- Safely enable real-time for all tables (handles existing tables)
-- Run this in Supabase SQL Editor

-- Check current real-time tables first
SELECT 
    schemaname,
    tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Safely add tables to real-time publication (ignores duplicates)
DO $$
DECLARE
    table_name TEXT;
BEGIN
    -- Add tables that might not be in real-time yet
    FOR table_name IN 
        SELECT t.table_name 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
        AND t.table_name IN ('chat_messages', 'leaderboard', 'user_status', 'tasks', 'habits', 'timer_sessions', 'notes', 'user_profiles')
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
            RAISE NOTICE '✅ Added %I to real-time publication', table_name;
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE '⚠️ %I already in real-time publication', table_name;
        END;
    END LOOP;
END $$;

-- Verify all real-time tables are now enabled
SELECT 
    schemaname,
    tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Create function for real-time message notifications (if not exists)
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
    -- This will automatically notify all connected clients
    -- through Supabase's real-time system
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safely create trigger for message notifications (replaces if exists)
DROP TRIGGER IF EXISTS trigger_notify_new_message ON chat_messages;
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- Create function for leaderboard updates (if not exists)
CREATE OR REPLACE FUNCTION update_leaderboard_on_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update leaderboard when user activity changes
    INSERT INTO leaderboard (user_id, username, total_focus_time, total_tasks_completed, current_habit_streak, xp_points, updated_at)
    VALUES (
        NEW.user_id,
        COALESCE((SELECT username FROM user_profiles WHERE user_id = NEW.user_id), 'Anonymous'),
        COALESCE((SELECT COALESCE(total_focus_time, 0) FROM timer_stats WHERE user_id = NEW.user_id), 0),
        COALESCE((SELECT COUNT(*) FROM tasks WHERE user_id = NEW.user_id AND completed = true), 0),
        COALESCE((SELECT MAX(current_streak) FROM habits WHERE user_id = NEW.user_id), 0),
        COALESCE((SELECT xp_points FROM leaderboard WHERE user_id = NEW.user_id), 0) + 10,
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_focus_time = EXCLUDED.total_focus_time + COALESCE(NEW.total_focus_time, 0),
        total_tasks_completed = EXCLUDED.total_tasks_completed + CASE WHEN TG_TABLE_NAME = 'tasks' AND NEW.completed = true THEN 1 ELSE 0 END,
        current_habit_streak = EXCLUDED.current_habit_streak + CASE WHEN TG_TABLE_NAME = 'habits' THEN 1 ELSE 0 END,
        xp_points = EXCLUDED.xp_points + 10,
        updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safely create triggers for leaderboard updates (replaces if exists)
DROP TRIGGER IF EXISTS trigger_leaderboard_tasks ON tasks;
CREATE TRIGGER trigger_leaderboard_tasks
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_leaderboard_on_activity();

DROP TRIGGER IF EXISTS trigger_leaderboard_timer ON timer_sessions;
CREATE TRIGGER trigger_leaderboard_timer
    AFTER INSERT ON timer_sessions
    FOR EACH ROW EXECUTE FUNCTION update_leaderboard_on_activity();

DROP TRIGGER IF EXISTS trigger_leaderboard_habits ON habits;
CREATE TRIGGER trigger_leaderboard_habits
    AFTER INSERT OR UPDATE ON habits
    FOR EACH ROW EXECUTE FUNCTION update_leaderboard_on_activity();

-- Test real-time functionality with a sample query
-- This should show current real-time status
SELECT 
    'Real-time Status Check' as status,
    COUNT(*) as enabled_tables
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'TaskPro Safe Real-time Setup Complete!';
    RAISE NOTICE '✅ All tables safely added to real-time publication';
    RAISE NOTICE '✅ Triggers created for automatic leaderboard updates';
    RAISE NOTICE '✅ Real-time notifications enabled for chat messages';
    RAISE NOTICE '🚀 Your TaskPro chat and leaderboard are now live!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Refresh your TaskPro application';
    RAISE NOTICE '2. Open browser console (F12)';
    RAISE NOTICE '3. Type: TaskProVerification.runAllTests()';
    RAISE NOTICE '4. Test chat and leaderboard features';
END $$;
