-- =============================================
-- QUICK FIX: RUN THIS FIRST IN SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/rckzzdgalqxvcikcmwyz/sql/new
-- =============================================

-- STEP 1: Temporarily disable RLS on users table to bootstrap
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- STEP 2: Check if you have any admin user - Run this to see:
-- SELECT * FROM users WHERE role = 'admin';

-- STEP 3: If no admin exists, create one (replace with your auth user ID)
-- First, get your auth user ID from Authentication > Users in Supabase Dashboard
-- Then run:
-- INSERT INTO users (id, email, name, role, is_active) 
-- VALUES ('YOUR-AUTH-USER-ID-HERE', 'your@email.com', 'Admin', 'admin', true);

-- STEP 4: Re-enable RLS with fixed policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop all existing user policies
DROP POLICY IF EXISTS "Admins can do everything on users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins full access on users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

-- Create new policies that work
-- Allow anyone authenticated to read users (needed for lookups)
CREATE POLICY "Authenticated users can view all users" ON users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can insert new users
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (is_admin());

-- Admins can update any user, users can update themselves
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (is_admin() OR auth.uid() = id);

-- Admins can delete users
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (is_admin());

-- =============================================
-- ALSO FIX OTHER TABLES
-- =============================================

-- Branches - allow read for all authenticated
DROP POLICY IF EXISTS "Admins can do everything on branches" ON branches;
DROP POLICY IF EXISTS "Users can view branches" ON branches;
CREATE POLICY "Authenticated can view branches" ON branches FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage branches" ON branches FOR ALL USING (is_admin());

-- Classes - allow read for all authenticated  
DROP POLICY IF EXISTS "Admins can do everything on classes" ON classes;
DROP POLICY IF EXISTS "Users can view classes" ON classes;
CREATE POLICY "Authenticated can view classes" ON classes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage classes" ON classes FOR ALL USING (is_admin());

-- Subjects - allow read for all authenticated
DROP POLICY IF EXISTS "Admins can do everything on subjects" ON subjects;
DROP POLICY IF EXISTS "Users can view subjects" ON subjects;
CREATE POLICY "Authenticated can view subjects" ON subjects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage subjects" ON subjects FOR ALL USING (is_admin());

-- Academic Levels
DROP POLICY IF EXISTS "Admins can do everything on academic_levels" ON academic_levels;
DROP POLICY IF EXISTS "Users can view academic_levels" ON academic_levels;
CREATE POLICY "Authenticated can view academic_levels" ON academic_levels FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage academic_levels" ON academic_levels FOR ALL USING (is_admin());

-- Students
DROP POLICY IF EXISTS "Admins can do everything on students" ON students;
DROP POLICY IF EXISTS "Users can view students" ON students;
CREATE POLICY "Authenticated can view students" ON students FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage students" ON students FOR ALL USING (is_admin());

-- User Assignments
DROP POLICY IF EXISTS "Admins can do everything on user_assignments" ON user_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON user_assignments;
CREATE POLICY "Authenticated can view user_assignments" ON user_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage user_assignments" ON user_assignments FOR ALL USING (is_admin());

-- Question Papers
DROP POLICY IF EXISTS "Admins can do everything on question_papers" ON question_papers;
DROP POLICY IF EXISTS "Admins full access on question_papers" ON question_papers;
DROP POLICY IF EXISTS "Users can view question papers" ON question_papers;
DROP POLICY IF EXISTS "Users can insert question papers" ON question_papers;
DROP POLICY IF EXISTS "Users can update own question papers" ON question_papers;
DROP POLICY IF EXISTS "Users can delete own question papers" ON question_papers;

CREATE POLICY "Authenticated can view question_papers" ON question_papers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert question_papers" ON question_papers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins or owner can update question_papers" ON question_papers FOR UPDATE USING (is_admin() OR uploaded_by = auth.uid());
CREATE POLICY "Admins or owner can delete question_papers" ON question_papers FOR DELETE USING (is_admin() OR uploaded_by = auth.uid());

-- Answer Sheets
DROP POLICY IF EXISTS "Admins can do everything on answer_sheets" ON answer_sheets;
DROP POLICY IF EXISTS "Admins full access on answer_sheets" ON answer_sheets;
DROP POLICY IF EXISTS "Users can view own answer sheets" ON answer_sheets;
DROP POLICY IF EXISTS "Users can insert answer sheets" ON answer_sheets;
DROP POLICY IF EXISTS "Users can update own answer sheets" ON answer_sheets;

CREATE POLICY "Authenticated can view answer_sheets" ON answer_sheets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert answer_sheets" ON answer_sheets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins or owner can update answer_sheets" ON answer_sheets FOR UPDATE USING (is_admin() OR graded_by = auth.uid());
CREATE POLICY "Admins can delete answer_sheets" ON answer_sheets FOR DELETE USING (is_admin());

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('question-papers', 'question-papers', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('answer-sheets', 'answer-sheets', true) ON CONFLICT (id) DO UPDATE SET public = true;

-- =============================================
-- DONE! Now your app should work.
-- =============================================
