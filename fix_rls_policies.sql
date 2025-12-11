-- =============================================
-- FIX RLS POLICIES FOR ALL TABLES
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- USERS TABLE POLICIES
-- =============================================
DROP POLICY IF EXISTS "Admins can do everything on users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Admins can do everything on users
CREATE POLICY "Admins full access on users" ON users
  FOR ALL USING (is_admin());

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- =============================================
-- QUESTION PAPERS POLICIES
-- =============================================

-- First, drop the existing restrictive policies
DROP POLICY IF EXISTS "Admins can do everything on question_papers" ON question_papers;
DROP POLICY IF EXISTS "Users can view assigned question papers" ON question_papers;
DROP POLICY IF EXISTS "Admins full access on question_papers" ON question_papers;
DROP POLICY IF EXISTS "Users can view question papers" ON question_papers;
DROP POLICY IF EXISTS "Users can insert question papers" ON question_papers;
DROP POLICY IF EXISTS "Users can update own question papers" ON question_papers;
DROP POLICY IF EXISTS "Users can delete own question papers" ON question_papers;

DROP POLICY IF EXISTS "Admins can do everything on answer_sheets" ON answer_sheets;
DROP POLICY IF EXISTS "Users can view their graded sheets" ON answer_sheets;
DROP POLICY IF EXISTS "Users can insert answer sheets" ON answer_sheets;
DROP POLICY IF EXISTS "Users can update their answer sheets" ON answer_sheets;

-- =============================================
-- QUESTION PAPERS POLICIES
-- =============================================

-- Admins can do everything
CREATE POLICY "Admins full access on question_papers" ON question_papers
  FOR ALL USING (is_admin());

-- Authenticated users can view all active question papers
CREATE POLICY "Users can view question papers" ON question_papers
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users with assignments can insert question papers for their assigned classes/subjects
CREATE POLICY "Users can insert question papers" ON question_papers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      is_admin() OR 
      EXISTS (
        SELECT 1 FROM user_assignments ua 
        WHERE ua.user_id = auth.uid() 
        AND ua.class_id = question_papers.class_id
        AND ua.subject_id = question_papers.subject_id
      )
    )
  );

-- Users can update their own uploaded question papers
CREATE POLICY "Users can update own question papers" ON question_papers
  FOR UPDATE USING (
    is_admin() OR uploaded_by = auth.uid()
  );

-- Users can delete their own uploaded question papers
CREATE POLICY "Users can delete own question papers" ON question_papers
  FOR DELETE USING (
    is_admin() OR uploaded_by = auth.uid()
  );

-- =============================================
-- ANSWER SHEETS POLICIES
-- =============================================

-- Admins can do everything
CREATE POLICY "Admins full access on answer_sheets" ON answer_sheets
  FOR ALL USING (is_admin());

-- Users can view answer sheets they graded
CREATE POLICY "Users can view own answer sheets" ON answer_sheets
  FOR SELECT USING (
    is_admin() OR graded_by = auth.uid()
  );

-- Users with upload permission can insert answer sheets
CREATE POLICY "Users can insert answer sheets" ON answer_sheets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      is_admin() OR 
      EXISTS (
        SELECT 1 FROM user_assignments ua 
        WHERE ua.user_id = auth.uid() 
        AND ua.class_id = answer_sheets.class_id
        AND ua.subject_id = answer_sheets.subject_id
        AND ua.can_upload = true
      )
    )
  );

-- Users can update their own answer sheets
CREATE POLICY "Users can update own answer sheets" ON answer_sheets
  FOR UPDATE USING (
    is_admin() OR graded_by = auth.uid()
  );

-- =============================================
-- STORAGE BUCKET POLICIES
-- =============================================
-- Run these in the Storage section or SQL Editor

-- For question-papers bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('question-papers', 'question-papers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- For answer-sheets bucket  
INSERT INTO storage.buckets (id, name, public) 
VALUES ('answer-sheets', 'answer-sheets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for question-papers
DROP POLICY IF EXISTS "Allow authenticated uploads to question-papers" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from question-papers" ON storage.objects;

CREATE POLICY "Allow authenticated uploads to question-papers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-papers');

CREATE POLICY "Allow public read from question-papers" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'question-papers');

CREATE POLICY "Allow authenticated delete from question-papers" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'question-papers');

-- Storage policies for answer-sheets
DROP POLICY IF EXISTS "Allow authenticated uploads to answer-sheets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from answer-sheets" ON storage.objects;

CREATE POLICY "Allow authenticated uploads to answer-sheets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'answer-sheets');

CREATE POLICY "Allow public read from answer-sheets" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'answer-sheets');

CREATE POLICY "Allow authenticated delete from answer-sheets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'answer-sheets');

-- =============================================
-- DONE! 
-- =============================================
-- After running this, question paper and answer sheet 
-- uploads should work for assigned users.
