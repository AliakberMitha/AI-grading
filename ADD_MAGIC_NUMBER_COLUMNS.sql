-- =============================================
-- ADD MAGIC NUMBER COLUMNS TO ANSWER_SHEETS
-- Run this in Supabase SQL Editor
-- =============================================

-- Add columns for extracted roll number (magic number)
ALTER TABLE answer_sheets 
ADD COLUMN IF NOT EXISTS extracted_roll_number VARCHAR(20);

ALTER TABLE answer_sheets 
ADD COLUMN IF NOT EXISTS roll_number_confidence INTEGER DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN answer_sheets.extracted_roll_number IS 'AI-extracted magic number/roll number from answer sheet';
COMMENT ON COLUMN answer_sheets.roll_number_confidence IS 'AI confidence level (0-100) for extracted roll number';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_answer_sheets_extracted_roll 
ON answer_sheets(extracted_roll_number);

-- =============================================
-- DONE! 
-- =============================================
