-- =====================================================
-- HABIT TRACKER DATABASE SCHEMA
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Habits table
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    color TEXT DEFAULT '#10b981',
    icon TEXT DEFAULT '🎯',
    streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_completed TIMESTAMPTZ,
    reminder_time TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit completions (for tracking history)
CREATE TABLE IF NOT EXISTS habit_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (optional - for additional user data)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    notification_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for better performance
-- =====================================================

CREATE INDEX IF NOT EXISTS habits_user_id_idx ON habits(user_id);
CREATE INDEX IF NOT EXISTS habits_created_at_idx ON habits(created_at);
CREATE INDEX IF NOT EXISTS habit_completions_habit_id_idx ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS habit_completions_user_id_idx ON habit_completions(user_id);
CREATE INDEX IF NOT EXISTS habit_completions_completed_at_idx ON habit_completions(completed_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own habits" ON habits;
DROP POLICY IF EXISTS "Users can insert their own habits" ON habits;
DROP POLICY IF EXISTS "Users can update their own habits" ON habits;
DROP POLICY IF EXISTS "Users can delete their own habits" ON habits;

DROP POLICY IF EXISTS "Users can view their own completions" ON habit_completions;
DROP POLICY IF EXISTS "Users can insert their own completions" ON habit_completions;
DROP POLICY IF EXISTS "Users can delete their own completions" ON habit_completions;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view all habits" ON habits;
DROP POLICY IF EXISTS "Users can view all completions" ON habit_completions;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Habits policies
CREATE POLICY "Users can view their own habits"
    ON habits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
    ON habits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
    ON habits FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
    ON habits FOR DELETE
    USING (auth.uid() = user_id);

-- Habit completions policies
CREATE POLICY "Users can view their own completions"
    ON habit_completions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions"
    ON habit_completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completions"
    ON habit_completions FOR DELETE
    USING (auth.uid() = user_id);

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at on habits
DROP TRIGGER IF EXISTS update_habits_updated_at ON habits;
CREATE TRIGGER update_habits_updated_at
    BEFORE UPDATE ON habits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- REALTIME SUBSCRIPTIONS (FIXED)
-- =====================================================

-- We use a DO block to check if tables are already in the publication 
-- before trying to add them, preventing the 42710 error.

DO $$
BEGIN
    -- Add habits if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'habits'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE habits;
    END IF;

    -- Add habit_completions if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'habit_completions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE habit_completions;
    END IF;
END $$;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample categories and habits (replace USER_ID with your actual user ID)
-- You can get your user ID from Supabase Dashboard > Authentication > Users

/*
INSERT INTO habits (user_id, name, category, color, icon, streak, best_streak) VALUES
    ('USER_ID', 'Morning Meditation', 'health', '#10b981', '🧘', 0, 0),
    ('USER_ID', 'Drink 8 Glasses of Water', 'health', '#3b82f6', '💧', 0, 0),
    ('USER_ID', 'Read 30 Minutes', 'learning', '#8b5cf6', '📚', 0, 0),
    ('USER_ID', 'Exercise', 'fitness', '#ef4444', '💪', 0, 0),
    ('USER_ID', 'Write in Journal', 'productivity', '#f59e0b', '✍️', 0, 0);
*/

-- =====================================================
-- STORAGE (IDEMPOTENT FIX)
-- =====================================================

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 1. DROP ALL EXISTING STORAGE POLICIES
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

-- 2. RE-CREATE "Public View" Policy
CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- 3. RE-CREATE "Upload" Policy
CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- 4. RE-CREATE "Update/Delete" Policy
CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- VIEWS (Optional - for analytics)
-- =====================================================

-- View for habit statistics
CREATE OR REPLACE VIEW habit_stats AS
SELECT 
    h.id,
    h.user_id,
    h.name,
    h.category,
    h.streak,
    h.best_streak,
    COUNT(hc.id) as total_completions,
    MAX(hc.completed_at) as last_completion,
    MIN(hc.completed_at) as first_completion,
    ROUND(
        COUNT(hc.id)::numeric / 
        GREATEST(EXTRACT(EPOCH FROM (NOW() - h.created_at)) / 86400, 1) * 100, 
        2
    ) as completion_rate
FROM habits h
LEFT JOIN habit_completions hc ON h.id = hc.habit_id
WHERE h.is_active = true
GROUP BY h.id, h.user_id, h.name, h.category, h.streak, h.best_streak;

-- Grant access to authenticated users
GRANT SELECT ON habit_stats TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Habit Tracker schema created successfully!';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '   1. Update app.js with your Supabase credentials';
    RAISE NOTICE '   2. Enable Google OAuth in Supabase Dashboard (optional)';
    RAISE NOTICE '   3. Test the application';
    RAISE NOTICE '   4. New functions added:';
    RAISE NOTICE '      - reset_streak(): Reset habit streak to 0';
    RAISE NOTICE '      - complete_habit(): Complete habit (increment streak and update last_completed)';
    RAISE NOTICE '      - handle_new_user(): Auto-create user profile';
END $$;

-- Function to complete habit (increment streak and update last_completed)
CREATE OR REPLACE FUNCTION complete_habit(habit_row_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE habits
    SET 
        streak = streak + 1,
        best_streak = GREATEST(streak + 1, best_streak),
        last_completed = NOW(),
        updated_at = NOW()
    WHERE id = habit_row_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset habit streak to 0
CREATE OR REPLACE FUNCTION reset_streak(habit_row_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE habits
    SET 
        streak = 0,
        updated_at = NOW()
    WHERE id = habit_row_id;
END;
$$ LANGUAGE plpgsql;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION complete_habit TO authenticated;
GRANT EXECUTE ON FUNCTION reset_streak TO authenticated;