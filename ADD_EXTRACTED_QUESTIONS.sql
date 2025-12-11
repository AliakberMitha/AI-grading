-- SQL to add extracted_questions column to question_papers table
-- Run this in Supabase SQL Editor

-- 1. Add extracted_questions column to store parsed questions from question paper
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'question_papers' 
                   AND column_name = 'extracted_questions') THEN
        ALTER TABLE question_papers ADD COLUMN extracted_questions JSONB DEFAULT NULL;
    END IF;
END $$;

-- 2. Add extraction_status to track if questions have been extracted
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'question_papers' 
                   AND column_name = 'extraction_status') THEN
        ALTER TABLE question_papers ADD COLUMN extraction_status VARCHAR(20) DEFAULT 'pending';
    END IF;
END $$;

-- 3. Add extraction_error to store any errors during extraction
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'question_papers' 
                   AND column_name = 'extraction_error') THEN
        ALTER TABLE question_papers ADD COLUMN extraction_error TEXT DEFAULT NULL;
    END IF;
END $$;

-- Example of extracted_questions structure:
-- {
--   "title": "Mathematics Mid-Term Exam",
--   "total_marks": 100,
--   "duration": "3 hours",
--   "instructions": ["Attempt all questions", "Show your work"],
--   "sections": [
--     {
--       "section": "A",
--       "section_name": "Multiple Choice Questions",
--       "total_marks": 20,
--       "instructions": "Choose the correct answer",
--       "questions": [
--         {
--           "question_number": "1",
--           "question_text": "What is 2 + 2?",
--           "options": ["A) 3", "B) 4", "C) 5", "D) 6"],
--           "correct_answer": "B) 4",
--           "marks": 1,
--           "question_type": "MCQ"
--         }
--       ]
--     },
--     {
--       "section": "B",
--       "section_name": "Short Answer Questions",
--       "total_marks": 30,
--       "instructions": "Answer in 2-3 sentences",
--       "questions": [
--         {
--           "question_number": "6",
--           "question_text": "Explain the concept of gravity.",
--           "expected_answer": "Gravity is a force that attracts objects with mass towards each other...",
--           "marks": 5,
--           "question_type": "Short"
--         }
--       ]
--     }
--   ]
-- }

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'question_papers' 
AND column_name IN ('extracted_questions', 'extraction_status', 'extraction_error')
ORDER BY column_name;
