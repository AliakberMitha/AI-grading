-- SQL to add section-wise grading support
-- Run this in Supabase SQL Editor

-- 1. Add section_wise_results column to store detailed section breakdown
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answer_sheets' 
                   AND column_name = 'section_wise_results') THEN
        ALTER TABLE answer_sheets ADD COLUMN section_wise_results JSONB DEFAULT '[]';
    END IF;
END $$;

-- 2. Add extracted_answers column to store all extracted text from answer sheet
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answer_sheets' 
                   AND column_name = 'extracted_answers') THEN
        ALTER TABLE answer_sheets ADD COLUMN extracted_answers JSONB DEFAULT '[]';
    END IF;
END $$;

-- 3. Add question_analysis column to store analyzed questions from paper
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answer_sheets' 
                   AND column_name = 'question_analysis') THEN
        ALTER TABLE answer_sheets ADD COLUMN question_analysis JSONB DEFAULT '[]';
    END IF;
END $$;

-- Example of section_wise_results structure:
-- [
--   {
--     "section": "A",
--     "section_name": "Multiple Choice Questions",
--     "questions": [
--       {
--         "question_number": "1",
--         "question_text": "What is the capital of France?",
--         "student_answer": "Paris",
--         "expected_answer": "Paris",
--         "marks_obtained": 1,
--         "max_marks": 1,
--         "feedback": "Correct answer"
--       },
--       ...
--     ],
--     "section_total": 8,
--     "section_max": 10,
--     "section_remarks": "Good performance in MCQs"
--   },
--   ...
-- ]

-- Example of extracted_answers structure:
-- [
--   {
--     "question_number": "1",
--     "answer_text": "The capital of France is Paris...",
--     "page_number": 1
--   },
--   ...
-- ]

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'answer_sheets' 
AND column_name IN ('section_wise_results', 'extracted_answers', 'question_analysis')
ORDER BY column_name;
