-- Enable permissions for the user who graded the answer sheet
-- This updates the assignment for the specific class/subject combination

-- First, let's see the current state
SELECT 
  ua.id,
  ua.user_id,
  u.email as user_email,
  c.name as class_name,
  s.name as subject_name,
  ua.can_upload,
  ua.can_grade,
  ua.can_edit_marks,
  ua.can_reevaluate
FROM user_assignments ua
JOIN auth.users u ON ua.user_id = u.id
LEFT JOIN classes c ON ua.class_id = c.id
LEFT JOIN subjects s ON ua.subject_id = s.id
WHERE ua.user_id = '152303ce-cd2c-41ad-a080-2a0f25da22af';

-- Now enable permissions for the assignment that matches the answer sheet
UPDATE user_assignments
SET 
  can_edit_marks = true,
  can_reevaluate = true
WHERE 
  user_id = '152303ce-cd2c-41ad-a080-2a0f25da22af'
  AND class_id = '2dbdd93b-2d89-45ce-8235-3a18d84869a7'
  AND subject_id = 'b84049b0-6c03-4bba-9d64-bca1d6fd9be3';

-- Verify the update
SELECT 
  ua.id,
  ua.can_edit_marks,
  ua.can_reevaluate
FROM user_assignments ua
WHERE 
  ua.user_id = '152303ce-cd2c-41ad-a080-2a0f25da22af'
  AND class_id = '2dbdd93b-2d89-45ce-8235-3a18d84869a7'
  AND subject_id = 'b84049b0-6c03-4bba-9d64-bca1d6fd9be3';
