-- =============================================
-- EMERGENCY FIX: DISABLE RLS TEMPORARILY
-- Run this in Supabase SQL Editor NOW
-- https://supabase.com/dashboard/project/rckzzdgalqxvcikcmwyz/sql/new
-- =============================================

-- Disable RLS on all tables (for development/testing)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE question_papers DISABLE ROW LEVEL SECURITY;
ALTER TABLE answer_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE page_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('question-papers', 'question-papers', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('answer-sheets', 'answer-sheets', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- =============================================
-- DONE! RLS is now disabled. 
-- Your app should work without permission errors.
-- 
-- NOTE: For production, you should re-enable RLS
-- with proper policies. This is just for development.
-- =============================================
