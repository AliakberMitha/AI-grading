-- SQL to update answer_sheets table schema for magic number extraction workflow
-- Run this in Supabase SQL Editor

-- 1. Make student_id optional (allow NULL)
ALTER TABLE answer_sheets ALTER COLUMN student_id DROP NOT NULL;

-- 2. Add manual_roll_number column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answer_sheets' 
                   AND column_name = 'manual_roll_number') THEN
        ALTER TABLE answer_sheets ADD COLUMN manual_roll_number VARCHAR(50);
    END IF;
END $$;

-- 3. Add extracted_roll_number column if not exists (for AI-extracted magic numbers)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answer_sheets' 
                   AND column_name = 'extracted_roll_number') THEN
        ALTER TABLE answer_sheets ADD COLUMN extracted_roll_number VARCHAR(50);
    END IF;
END $$;

-- 4. Add roll_number_confidence column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answer_sheets' 
                   AND column_name = 'roll_number_confidence') THEN
        ALTER TABLE answer_sheets ADD COLUMN roll_number_confidence INTEGER DEFAULT 0;
    END IF;
END $$;

-- 5. Add index on extracted_roll_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_answer_sheets_extracted_roll 
ON answer_sheets(extracted_roll_number);

-- 6. Add index on manual_roll_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_answer_sheets_manual_roll 
ON answer_sheets(manual_roll_number);

-- 7. Update existing rows with NULL student_id if needed (optional - cleanup)
-- UPDATE answer_sheets SET student_id = NULL WHERE student_id IS NOT NULL AND extracted_roll_number IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'answer_sheets' 
AND column_name IN ('student_id', 'manual_roll_number', 'extracted_roll_number', 'roll_number_confidence')
ORDER BY column_name;
