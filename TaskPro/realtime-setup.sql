-- ===== TASKPRO REAL-TIME ENABLEMENT =====
-- Secure real-time configuration for chat_messages table
-- Run this in Supabase SQL Editor after creating tables

-- Enable real-time for chat_messages specifically
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Additional real-time tables for full TaskPro experience
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard;
ALTER PUBLICATION supabase_realtime ADD TABLE user_status;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE habits;
ALTER PUBLICATION supabase_realtime ADD TABLE timer_sessions;

-- Verify real-time is enabled
SELECT 
    schemaname,
    tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Create function for real-time message notifications
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
    -- This will automatically notify all connected clients
    -- through Supabase's real-time system
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for real-time message notifications
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- Create function for leaderboard updates
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

-- Triggers for leaderboard updates
CREATE TRIGGER trigger_leaderboard_tasks
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_leaderboard_on_activity();

CREATE TRIGGER trigger_leaderboard_timer
    AFTER INSERT ON timer_sessions
    FOR EACH ROW EXECUTE FUNCTION update_leaderboard_on_activity();

CREATE TRIGGER trigger_leaderboard_habits
    AFTER INSERT OR UPDATE ON habits
    FOR EACH ROW EXECUTE FUNCTION update_leaderboard_on_activity();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'TaskPro Real-time Configuration Complete!';
    RAISE NOTICE '✅ chat_messages: Real-time enabled';
    RAISE NOTICE '✅ leaderboard: Real-time enabled';
    RAISE NOTICE '✅ user_status: Real-time enabled';
    RAISE NOTICE '✅ tasks: Real-time enabled';
    RAISE NOTICE '✅ habits: Real-time enabled';
    RAISE NOTICE '✅ timer_sessions: Real-time enabled';
    RAISE NOTICE '🚀 Your TaskPro chat and leaderboard are now live!';
END $$;
