-- SQL to add can_edit_marks and can_reevaluate columns to user_assignments table
-- Run this in Supabase SQL Editor

-- 1. Add can_edit_marks column - allows user to manually edit marks for graded answers
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_assignments' 
                   AND column_name = 'can_edit_marks') THEN
        ALTER TABLE user_assignments ADD COLUMN can_edit_marks BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Add can_reevaluate column - allows user to request section-wise re-evaluation
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_assignments' 
                   AND column_name = 'can_reevaluate') THEN
        ALTER TABLE user_assignments ADD COLUMN can_reevaluate BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_assignments' 
AND column_name IN ('can_edit_marks', 'can_reevaluate', 'can_upload', 'can_grade')
ORDER BY column_name;
