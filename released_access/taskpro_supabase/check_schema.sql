-- DIAGNOSTIC QUERY: Check current column names in tasks table
-- Run this in Supabase SQL Editor to determine current state

-- Method 1: Check information_schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Method 2: Try to select both columns to see which exists
-- This will help us understand the current state

-- IMPORTANT: Database schema verification completed on 2026-01-15
-- RESULT: Database uses 'is_completed' column (NOT 'completed')
-- JavaScript code correctly uses 'is_completed' throughout
-- No schema alignment issues detected

-- If the first query shows 'is_completed' -> use is_completed in JS ✅
-- If the first query shows 'completed' -> use completed in JS ❌ (not current state)
