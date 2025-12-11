-- =============================================
-- AI GRADING SYSTEM - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. BRANCHES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. USERS TABLE (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  itsid VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. CLASSES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name)
);

-- =============================================
-- 4. SUBJECTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name)
);

-- =============================================
-- 5. ACADEMIC LEVELS (Class + Subject Config)
-- =============================================
CREATE TABLE IF NOT EXISTS academic_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  weightage JSONB DEFAULT '{"content": 60, "language": 40}',
  max_marks INTEGER DEFAULT 100,
  strictness_level INTEGER DEFAULT 50 CHECK (strictness_level >= 0 AND strictness_level <= 100),
  grading_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, subject_id)
);

-- =============================================
-- 6. USER ASSIGNMENTS (Class/Subject/Branch)
-- =============================================
CREATE TABLE IF NOT EXISTS user_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  can_upload BOOLEAN DEFAULT true,
  can_grade BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, class_id, subject_id)
);

-- =============================================
-- 7. STUDENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  roll_number VARCHAR(50) NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(roll_number, class_id)
);

-- =============================================
-- 8. QUESTION PAPERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS question_papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  total_marks INTEGER DEFAULT 100,
  exam_date DATE,
  instructions TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 9. ANSWER SHEETS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS answer_sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_paper_id UUID NOT NULL REFERENCES question_papers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_hash VARCHAR(64), -- For duplicate detection
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'graded', 'error')),
  
  -- Grading Results
  content_score DECIMAL(5,2),
  language_score DECIMAL(5,2),
  total_score DECIMAL(5,2),
  grade VARCHAR(10),
  remarks TEXT,
  ai_response JSONB,
  issues TEXT[],
  
  -- Metadata
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  graded_at TIMESTAMP WITH TIME ZONE,
  is_re_evaluated BOOLEAN DEFAULT false,
  re_evaluation_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate uploads
  UNIQUE(file_hash)
);

-- =============================================
-- 10. PAGE PERMISSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS page_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_name VARCHAR(100) NOT NULL,
  can_access BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, page_name)
);

-- =============================================
-- 11. ACTIVITY LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 12. RE-EVALUATION LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS re_evaluation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  answer_sheet_id UUID NOT NULL REFERENCES answer_sheets(id) ON DELETE CASCADE,
  evaluation_type VARCHAR(20) NOT NULL CHECK (evaluation_type IN ('full', 'section')),
  section_index INTEGER,
  section_name VARCHAR(255),
  previous_total_score DECIMAL(6,2),
  previous_section_score DECIMAL(6,2),
  new_total_score DECIMAL(6,2),
  new_section_score DECIMAL(6,2),
  previous_grade VARCHAR(10),
  new_grade VARCHAR(10),
  triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch_id);
CREATE INDEX IF NOT EXISTS idx_answer_sheets_status ON answer_sheets(status);
CREATE INDEX IF NOT EXISTS idx_answer_sheets_student ON answer_sheets(student_id);
CREATE INDEX IF NOT EXISTS idx_answer_sheets_class_subject ON answer_sheets(class_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_user_assignments_user ON user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_question_papers_class_subject ON question_papers(class_id, subject_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE re_evaluation_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES FOR ADMIN (Full Access)
-- =============================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Branches: Admin full access, Users read only
CREATE POLICY "Admins can do everything on branches" ON branches
  FOR ALL USING (is_admin());
  
CREATE POLICY "Users can view branches" ON branches
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users: Admin full access, Users can see themselves
CREATE POLICY "Admins can do everything on users" ON users
  FOR ALL USING (is_admin());
  
CREATE POLICY "Users can view themselves" ON users
  FOR SELECT USING (auth.uid() = id);

-- Classes: Admin full access, Users read only
CREATE POLICY "Admins can do everything on classes" ON classes
  FOR ALL USING (is_admin());
  
CREATE POLICY "Users can view classes" ON classes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Subjects: Admin full access, Users read only
CREATE POLICY "Admins can do everything on subjects" ON subjects
  FOR ALL USING (is_admin());
  
CREATE POLICY "Users can view subjects" ON subjects
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Academic Levels: Admin full access, Users read only
CREATE POLICY "Admins can do everything on academic_levels" ON academic_levels
  FOR ALL USING (is_admin());
  
CREATE POLICY "Users can view academic_levels" ON academic_levels
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- User Assignments: Admin full access, Users can see their own
CREATE POLICY "Admins can do everything on user_assignments" ON user_assignments
  FOR ALL USING (is_admin());
  
CREATE POLICY "Users can view their assignments" ON user_assignments
  FOR SELECT USING (auth.uid() = user_id);

-- Students: Admin full access, Users can see assigned class students
CREATE POLICY "Admins can do everything on students" ON students
  FOR ALL USING (is_admin());
  
CREATE POLICY "Users can view students in assigned classes" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_assignments ua 
      WHERE ua.user_id = auth.uid() 
      AND ua.class_id = students.class_id
    )
  );

-- Question Papers: Admin full access, Users can see assigned
CREATE POLICY "Admins can do everything on question_papers" ON question_papers
  FOR ALL USING (is_admin());
  
CREATE POLICY "Users can view assigned question papers" ON question_papers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_assignments ua 
      WHERE ua.user_id = auth.uid() 
      AND ua.class_id = question_papers.class_id
      AND ua.subject_id = question_papers.subject_id
    )
  );

-- Answer Sheets: Admin full access, Users can manage their uploads
CREATE POLICY "Admins can do everything on answer_sheets" ON answer_sheets
  FOR ALL USING (is_admin());
  
CREATE POLICY "Users can view their graded sheets" ON answer_sheets
  FOR SELECT USING (graded_by = auth.uid());
  
CREATE POLICY "Users can insert answer sheets" ON answer_sheets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_assignments ua 
      WHERE ua.user_id = auth.uid() 
      AND ua.class_id = answer_sheets.class_id
      AND ua.subject_id = answer_sheets.subject_id
      AND ua.can_upload = true
    )
  );

CREATE POLICY "Users can update their answer sheets" ON answer_sheets
  FOR UPDATE USING (graded_by = auth.uid());

-- Page Permissions: Admin full access
CREATE POLICY "Admins can manage page_permissions" ON page_permissions
  FOR ALL USING (is_admin());
  
CREATE POLICY "Users can view their permissions" ON page_permissions
  FOR SELECT USING (user_id = auth.uid());

-- Activity Logs: Admin full access, Users can see their own
CREATE POLICY "Admins can view all activity_logs" ON activity_logs
  FOR SELECT USING (is_admin());
  
CREATE POLICY "Users can view their activity" ON activity_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Anyone can insert activity_logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Re-evaluation Logs: Admin full access, users can view their own requests
CREATE POLICY "Admins can do everything on re_evaluation_logs" ON re_evaluation_logs
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view their re-evaluation logs" ON re_evaluation_logs
  FOR SELECT USING (triggered_by = auth.uid());

-- =============================================
-- STORAGE BUCKET SETUP (Run separately)
-- =============================================
-- Go to Supabase Dashboard > Storage > Create Bucket
-- Create buckets: 'question-papers', 'answer-sheets'
-- Set them to public or configure appropriate policies

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academic_levels_updated_at BEFORE UPDATE ON academic_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_papers_updated_at BEFORE UPDATE ON question_papers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_answer_sheets_updated_at BEFORE UPDATE ON answer_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample branch
INSERT INTO branches (name, code) VALUES 
  ('Main Branch', 'MAIN'),
  ('City Branch', 'CITY')
ON CONFLICT (name) DO NOTHING;

-- Insert sample classes
INSERT INTO classes (name, code) VALUES 
  ('Class 8', 'VIII'),
  ('Class 9', 'IX'),
  ('Class 10', 'X'),
  ('Class 11', 'XI'),
  ('Class 12', 'XII')
ON CONFLICT (name) DO NOTHING;

-- Insert sample subjects
INSERT INTO subjects (name, code) VALUES 
  ('Mathematics', 'MATH'),
  ('Science', 'SCI'),
  ('English', 'ENG'),
  ('Social Studies', 'SST'),
  ('Computer Science', 'CS')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- FUNCTION TO CREATE ADMIN USER
-- Run this after creating a user via Supabase Auth
-- =============================================
-- Example:
-- INSERT INTO users (id, itsid, email, role, branch_id)
-- VALUES (
--   'YOUR-AUTH-USER-UUID',
--   'ADMIN001',
--   'admin@example.com',
--   'admin',
--   (SELECT id FROM branches WHERE code = 'MAIN')
-- );
