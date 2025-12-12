// Supabase Edge Function: grade-answer-sheet
// Deploy with: supabase functions deploy grade-answer-sheet

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B+'
  if (percentage >= 60) return 'B'
  if (percentage >= 50) return 'C+'
  if (percentage >= 40) return 'C'
  if (percentage >= 33) return 'D'
  return 'F'
}

function sanitizeMagicNumber(value: unknown): string | null {
  if (value === undefined || value === null) return null
  const digits = String(value).replace(/\D/g, '')
  if (digits.length < 5 || digits.length > 15) return null
  return digits
}

function buildGradingPrompt(config: any, extractedQuestions: any): string {
  const { maxMarks, contentWeightage, languageWeightage, strictnessLevel, gradingInstructions } = config

  const strictnessText = strictnessLevel <= 30 
    ? 'lenient (give benefit of doubt, accept partially correct answers generously)' 
    : strictnessLevel <= 60 
    ? 'moderate (balanced evaluation, fair partial marking)' 
    : 'strict (rigorous grading, exact answers required, penalize errors)'

  // Build rubric JSON from extracted questions
  let rubricJson = JSON.stringify(extractedQuestions, null, 0)
  // Truncate if too long to fit in prompt (Gemini 2.0 can handle ~100K tokens, so 50K chars is safe)
  if (rubricJson.length > 50000) {
    rubricJson = rubricJson.substring(0, 50000) + '...(truncated)'
    console.warn('Rubric JSON truncated from', extractedQuestions.length, 'to 50000 chars')
  }

  return `## SYSTEM ROLE
You are an expert exam grader. Grade the answer sheet based on the provided rubric. Be fair, thorough, and provide detailed feedback for each question.

IMPORTANT: The maximum marks for this exam is ${maxMarks}. The obtained marks must NOT exceed this value.

## GRADING PARAMETERS
- Content Weightage: ${contentWeightage}% (accuracy, completeness, correctness)
- Language Weightage: ${languageWeightage}% (grammar, spelling, clarity, presentation)
- Strictness: ${strictnessText}
${gradingInstructions ? `- Special Instructions: ${gradingInstructions}` : ''}

## QUESTION PAPER RUBRIC
${rubricJson}

## CRITICAL REQUIREMENT - EVALUATE ALL QUESTIONS
**YOU MUST EVALUATE EVERY SINGLE QUESTION** from the rubric. Do not skip any question.
- If a student did not answer a question, mark it as: marks_obtained = 0, student_answer = "Not answered", feedback = "Question not attempted"
- If a student's answer is unclear/illegible, try your best to interpret it and grade it
- EVERY question number from the rubric MUST appear in your response

## SPECIAL GRADING RULES

### MCQ (Multiple Choice Questions):
- Award FULL marks if the selected option matches the correct answer exactly
- Award ZERO marks if wrong option is selected or not answered
- Look for circled/marked/ticked options (A, B, C, D) or written option letters

### Fill in the Blanks:
- Award FULL marks if the answer is exactly correct or semantically equivalent
- For partial matches, award proportional marks based on correctness
- Award ZERO marks if blank is left empty
- Spelling errors: Minor errors okay if word is recognizable (lenient/moderate), exact match required (strict)

### True/False Questions:
- Award FULL marks for correct answer (True/T/Yes or False/F/No)
- Award ZERO marks for incorrect or missing answer

### Short/Long Answer Questions:
- Evaluate based on content accuracy, completeness, and presentation
- Award partial marks for partially correct answers
- Award ZERO marks if question is not attempted

### Attempt Limits:
- If a section says "Attempt any X out of Y questions", ONLY GRADE THE FIRST X ANSWERED questions
- Extra answered questions beyond the required count should be marked as: is_extra = true, marks_obtained = 0
- But still include them in the response

## YOUR TASK

Grade this answer sheet. **YOU MUST:**
1. Find and grade EVERY question from the rubric - no exceptions
2. For each question, extract the student's complete answer (or note "Not answered" if blank)
3. Compare against the correct answer from rubric
4. Award appropriate marks based on question type and rubric
5. Provide specific feedback for each question

Also find the student's Magic Number / Roll Number (usually at center or top of answer sheet).
- Extract digits only. If the detected number has fewer than 5 or more than 15 digits, treat it as invalid and return null with confidence 0.

## RESPONSE FORMAT (JSON ONLY)

{
  "magic_number": "<extracted roll/magic number or null>",
  "magic_number_confidence": <0-100 confidence score>,
  "section_wise_results": [
    {
      "section": "A",
      "section_name": "Section A",
      "section_type": "MCQ|FillBlank|Short|Long|Mixed",
      "attempt_required": <number or null if all required>,
      "questions_attempted": <number of questions student attempted>,
      "questions_graded": <number of questions actually graded>,
      "questions": [
        {
          "question_number": "1",
          "question_text": "<the question>",
          "question_type": "MCQ|FillBlank|TrueFalse|Short|Long|Numerical",
          "student_answer": "<FULL transcription of student's answer OR 'Not answered'>",
          "correct_answer": "<expected correct answer>",
          "is_correct": <true|false for objective questions>,
          "marks_obtained": <number - 0 if not answered>,
          "max_marks": <number>,
          "feedback": "<detailed explanation OR 'Question not attempted'>",
          "is_extra": <true if this is an extra answer beyond attempt limit>
        }
      ],
      "section_total": <sum of marks in section>,
      "section_max": <max possible for section>
    }
  ],
  "content_score": <marks for content accuracy>,
  "language_score": <marks for language/presentation>,
  "total_score": <final score - MUST NOT exceed ${maxMarks}>,
  "grade": "<A+/A/B+/B/C+/C/D/F>",
  "overall_feedback": "<comprehensive feedback on student's performance>",
  "strengths": ["<what student did well>"],
  "improvements": ["<areas for improvement>"],
  "issues": ["<any grading issues or unclear answers>"]
}

## CRITICAL REMINDERS
1. For MCQ/FillBlank/TrueFalse: Check correct answer strictly, award full or zero marks
2. For attempt limits: Only grade the required number of questions, ignore extras
3. Maximum total score cannot exceed ${maxMarks}
4. Include "max_marks" for each question so we can show "X/Y" format in report
5. **GRADE ALL ${extractedQuestions?.sections?.length || 0} SECTIONS** - Every section in the rubric must appear in your response
6. If the rubric has MCQ/Fill-in-the-blank sections, they MUST be graded (usually Section V or last section)
7. Return ONLY valid JSON, no other text`
}

function buildFallbackPrompt(config: any): string {
  const { maxMarks, contentWeightage, languageWeightage, strictnessLevel } = config
  const strictnessText = strictnessLevel <= 30 ? 'lenient' : strictnessLevel <= 60 ? 'moderate' : 'strict'
  
  return `## SYSTEM ROLE
You are an expert exam grader. Grade the answer sheet based on the question paper provided.

IMPORTANT: The maximum marks for this exam is ${maxMarks}. The obtained marks must NOT exceed this value.

## IMAGES PROVIDED
- Image 1: Question Paper (extract questions and create rubric from this)
- Image 2: Student Answer Sheet (grade this)

## GRADING PARAMETERS
- Content Weightage: ${contentWeightage}%
- Language Weightage: ${languageWeightage}%
- Strictness: ${strictnessText}

## YOUR TASK
1. First, analyze the question paper to understand all questions and their marks
2. Then, grade the answer sheet by:
   - Extracting and transcribing each student answer
   - Comparing against expected answers
   - Awarding appropriate marks
   - Providing detailed feedback

Magic Number / Roll Number rules:
- Extract digits only from the sheet.
- If the resulting number has fewer than 5 digits or more than 15 digits, return null for magic_number and set confidence to 0.

## RESPONSE FORMAT (JSON ONLY)
{
  "magic_number": "<student roll/magic number or null>",
  "magic_number_confidence": <0-100>,
  "section_wise_results": [
    {
      "section": "A",
      "section_name": "Section A",
      "questions": [
        {
          "question_number": "1",
          "student_answer": "<transcribed answer>",
          "marks_obtained": 0,
          "max_marks": 0,
          "feedback": "<grading explanation>"
        }
      ],
      "section_total": 0,
      "section_max": 0
    }
  ],
  "total_score": 0,
  "grade": "F",
  "overall_feedback": "<comprehensive feedback>",
  "issues": []
}

Return ONLY valid JSON.`
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, Array.from(chunk))
  }
  return btoa(binary)
}

function getMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase()?.split('?')[0]
  const types: Record<string, string> = {
    'pdf': 'application/pdf', 'png': 'image/png', 
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp'
  }
  return types[ext || ''] || 'image/jpeg'
}

function parseJSON(text: string): any {
  console.log('Response length:', text.length)
  console.log('Response preview:', text.substring(0, 1000))
  
  // Try to extract JSON from markdown code blocks
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  let jsonStr = codeMatch ? codeMatch[1].trim() : text
  
  // Or find raw JSON
  if (!codeMatch) {
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (jsonMatch) jsonStr = jsonMatch[0]
  }

  // Try direct parse
  try {
    return JSON.parse(jsonStr)
  } catch (e: any) {
    console.log('Parse failed:', e.message)
  }

  // Fix common issues
  let fixed = jsonStr
    .replace(/,(\s*[\]\}])/g, '$1')  // trailing commas
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')  // control chars
    .replace(/\n/g, ' ')  // newlines in strings
  
  try {
    return JSON.parse(fixed)
  } catch (e: any) {
    console.log('Fixed parse failed:', e.message)
  }

  // Try to extract key values manually
  const magicMatch = fixed.match(/"magic_number"\s*:\s*"([^"]*)"/)
  const totalMatch = fixed.match(/"total_score"\s*:\s*(\d+(?:\.\d+)?)/)
  const gradeMatch = fixed.match(/"grade"\s*:\s*"([^"]*)"/)
  const remarksMatch = fixed.match(/"remarks"\s*:\s*"([^"]*)"/)

  if (totalMatch || gradeMatch) {
    console.log('Extracted partial data')
    const sanitizedMagic = sanitizeMagicNumber(magicMatch?.[1])
    return {
      magic_number: sanitizedMagic,
      magic_number_confidence: sanitizedMagic ? 80 : 0,
      section_wise_results: [],
      extracted_answers: [],
      content_score: totalMatch ? parseFloat(totalMatch[1]) * 0.6 : 0,
      language_score: totalMatch ? parseFloat(totalMatch[1]) * 0.4 : 0,
      total_score: totalMatch ? parseFloat(totalMatch[1]) : 0,
      grade: gradeMatch?.[1] || 'F',
      remarks: remarksMatch?.[1] || 'Partial data extracted',
      issues: ['Response partially parsed']
    }
  }

  // Last resort: find balanced JSON
  try {
    let depth = 0, start = -1, end = -1
    for (let i = 0; i < fixed.length; i++) {
      if (fixed[i] === '{') { if (depth === 0) start = i; depth++ }
      else if (fixed[i] === '}') { depth--; if (depth === 0) { end = i; break } }
    }
    if (start >= 0 && end > start) {
      return JSON.parse(fixed.substring(start, end + 1))
    }
  } catch (e) {}

  console.error('All parsing failed')
  return {
    magic_number: null, magic_number_confidence: 0,
    section_wise_results: [], extracted_answers: [],
    content_score: 0, language_score: 0, total_score: 0,
    grade: 'F', remarks: 'Failed to parse AI response',
    issues: ['AI response malformed']
  }
}

// List of Gemini models to try in order (fallback support - all support vision)
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-002',
  'gemini-1.5-flash-002'
]

async function callGemini(prompt: string, imageUrl: string, questionPaperUrl?: string): Promise<any> {
  const parts: any[] = [{ text: prompt }]

  // Add question paper image if provided (for fallback mode)
  if (questionPaperUrl) {
    try {
      const qpBase64 = await fetchImageAsBase64(questionPaperUrl)
      parts.push({ inline_data: { mime_type: getMimeType(questionPaperUrl), data: qpBase64 } })
    } catch (e) {
      console.error('Failed to load question paper:', e)
    }
  }

  // Add answer sheet image
  const asBase64 = await fetchImageAsBase64(imageUrl)
  parts.push({ inline_data: { mime_type: getMimeType(imageUrl), data: asBase64 } })

  console.log('Calling Gemini with', parts.length, 'parts')

  let lastError: Error | null = null

  // Try each model in sequence until one works
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`Trying model: ${model}`)
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
          })
        }
      )

      if (!response.ok) {
        const err = await response.json()
        const errorMsg = err.error?.message || 'Gemini API failed'
        console.warn(`Model ${model} failed: ${errorMsg}`)
        
        // If overloaded or quota exceeded, try next model
        if (errorMsg.includes('overloaded') || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
          lastError = new Error(errorMsg)
          continue
        }
        
        throw new Error(errorMsg)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        console.warn(`Model ${model} returned empty response, trying next...`)
        lastError = new Error('Empty response from Gemini')
        continue
      }

      console.log(`Success with model: ${model}`)
      const parsed = parseJSON(text)
      const sanitizedMagic = sanitizeMagicNumber(parsed?.magic_number)
      if (sanitizedMagic) {
        parsed.magic_number = sanitizedMagic
        const confidence = Number(parsed.magic_number_confidence)
        parsed.magic_number_confidence = Number.isFinite(confidence) ? Math.min(100, Math.max(0, confidence)) : 80
      } else {
        parsed.magic_number = null
        parsed.magic_number_confidence = 0
      }
      return parsed
      
    } catch (e: any) {
      console.warn(`Model ${model} error: ${e.message}`)
      lastError = e
      // Continue to next model
    }
  }

  // All models failed
  throw lastError || new Error('All Gemini models failed')
}

function calculateTotals(sections: any[], maxMarks: number, contentW: number, langW: number) {
  let total = 0
  for (const s of sections) {
    if (s.questions) {
      for (const q of s.questions) total += q.marks_obtained || 0
    } else if (s.section_total) {
      total += s.section_total
    }
  }
  total = Math.min(total, maxMarks)
  return {
    contentScore: total * contentW / 100,
    languageScore: total * langW / 100,
    totalScore: total
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const { answer_sheet_id, is_re_evaluation, requested_by } = await req.json()

    if (!answer_sheet_id) throw new Error('answer_sheet_id required')

    console.log('Processing:', answer_sheet_id)

    // Fetch answer sheet with question paper
    const { data: sheet, error: fetchErr } = await supabase
      .from('answer_sheets')
      .select(`*, question_papers (id, title, total_marks, file_url, extracted_questions, extraction_status, class_id, subject_id)`)
      .eq('id', answer_sheet_id)
      .single()

    if (fetchErr) throw fetchErr
    if (!sheet) throw new Error('Answer sheet not found')

    const previousScores = {
      total: typeof sheet.total_score === 'number' ? Number(sheet.total_score) : null,
      content: typeof sheet.content_score === 'number' ? Number(sheet.content_score) : null,
      language: typeof sheet.language_score === 'number' ? Number(sheet.language_score) : null,
      grade: sheet.grade || null,
      sectionResults: Array.isArray(sheet.section_wise_results) ? sheet.section_wise_results : []
    }

    const qp = sheet.question_papers
    const hasExtracted = qp?.extraction_status === 'completed' && qp?.extracted_questions

    console.log('Answer sheet:', sheet.file_url)
    console.log('Has extracted questions:', hasExtracted)

    // Update status
    await supabase.from('answer_sheets').update({ status: 'processing' }).eq('id', answer_sheet_id)

    // Get academic settings
    const { data: primaryAcademic } = await supabase
      .from('academic_levels')
      .select('*')
      .eq('class_id', sheet.class_id)
      .eq('subject_id', sheet.subject_id)
      .maybeSingle()

    let academic = primaryAcademic

    if (!academic && qp?.class_id && qp?.subject_id && (qp.class_id !== sheet.class_id || qp.subject_id !== sheet.subject_id)) {
      const { data: fallbackAcademic } = await supabase
        .from('academic_levels')
        .select('*')
        .eq('class_id', qp.class_id)
        .eq('subject_id', qp.subject_id)
        .maybeSingle()

      if (fallbackAcademic) {
        academic = fallbackAcademic
      }
    }

    const rawContentWeightage = Number(academic?.weightage?.content)
    const rawLanguageWeightage = Number(academic?.weightage?.language)

    let contentWeightage = Number.isFinite(rawContentWeightage) ? rawContentWeightage : null
    let languageWeightage = Number.isFinite(rawLanguageWeightage) ? rawLanguageWeightage : null

    if (contentWeightage === null && languageWeightage === null) {
      contentWeightage = 60
      languageWeightage = 40
    } else if (contentWeightage === null) {
      contentWeightage = Math.max(0, 100 - languageWeightage)
    } else if (languageWeightage === null) {
      languageWeightage = Math.max(0, 100 - contentWeightage)
    }

    const weightageSum = (contentWeightage ?? 0) + (languageWeightage ?? 0)
    if (weightageSum <= 0) {
      contentWeightage = 60
      languageWeightage = 40
    } else if (weightageSum !== 100) {
      const normalizedContent = (contentWeightage / weightageSum) * 100
      contentWeightage = Number(normalizedContent.toFixed(2))
      languageWeightage = Number((100 - contentWeightage).toFixed(2))
    }

    const academicMaxMarks = Number(academic?.max_marks)
    const questionPaperMaxMarks = Number(qp?.total_marks)
    const maxMarks = Number.isFinite(academicMaxMarks) && academicMaxMarks > 0
      ? academicMaxMarks
      : (Number.isFinite(questionPaperMaxMarks) && questionPaperMaxMarks > 0 ? questionPaperMaxMarks : 100)

    const strictnessRaw = Number(academic?.strictness_level)
    const strictnessLevel = Number.isFinite(strictnessRaw)
      ? Math.min(100, Math.max(0, strictnessRaw))
      : 50

    const config = {
      maxMarks,
      contentWeightage,
      languageWeightage,
      strictnessLevel,
      gradingInstructions: academic?.grading_instructions ?? ''
    }

    // Grade
    let result
    if (hasExtracted) {
      const prompt = buildGradingPrompt(config, qp.extracted_questions)
      result = await callGemini(prompt, sheet.file_url)
    } else if (qp?.file_url) {
      const prompt = buildFallbackPrompt(config)
      result = await callGemini(prompt, sheet.file_url, qp.file_url)
    } else {
      throw new Error('No question paper available')
    }

    // Calculate scores
    let contentScore, languageScore, totalScore
    if (result.section_wise_results?.length > 0) {
      const calc = calculateTotals(result.section_wise_results, config.maxMarks, config.contentWeightage, config.languageWeightage)
      contentScore = calc.contentScore
      languageScore = calc.languageScore
      totalScore = calc.totalScore
    } else {
      contentScore = Math.min(result.content_score || 0, config.maxMarks * config.contentWeightage / 100)
      languageScore = Math.min(result.language_score || 0, config.maxMarks * config.languageWeightage / 100)
      totalScore = Math.min((result.total_score || contentScore + languageScore), config.maxMarks)
    }

    const grade = calculateGrade((totalScore / config.maxMarks) * 100)

    console.log('Scores:', { contentScore, languageScore, totalScore, grade })

    const sanitizedMagicNumber = sanitizeMagicNumber(result.magic_number)
    const magicConfidence = sanitizedMagicNumber
      ? Math.min(100, Math.max(0, Number(result.magic_number_confidence) || 0))
      : 0

    result.magic_number = sanitizedMagicNumber
    result.magic_number_confidence = magicConfidence

    // Save with all response fields
    const { error: updateError } = await supabase.from('answer_sheets').update({
      status: 'graded',
      content_score: contentScore,
      language_score: languageScore,
      total_score: totalScore,
      grade,
      remarks: result.overall_feedback || result.remarks || '',
      issues: result.issues || [],
      extracted_roll_number: sanitizedMagicNumber,
      roll_number_confidence: magicConfidence,
      section_wise_results: result.section_wise_results || [],
      extracted_answers: result.extracted_answers || [],
      ai_response: {
        ...result,
        strengths: result.strengths || [],
        improvements: result.improvements || []
      },
      graded_at: new Date().toISOString()
    }).eq('id', answer_sheet_id)

    if (updateError) throw updateError

    if (is_re_evaluation) {
      const { error: logError } = await supabase.from('re_evaluation_logs').insert({
        answer_sheet_id,
        evaluation_type: 'full',
        previous_total_score: previousScores.total,
        previous_section_score: null,
        new_total_score: totalScore,
        new_section_score: null,
        previous_grade: previousScores.grade,
        new_grade: grade,
        triggered_by: requested_by || sheet.graded_by || null,
        details: {
          previous_content_score: previousScores.content,
          previous_language_score: previousScores.language,
          new_content_score: contentScore,
          new_language_score: languageScore
        }
      })

      if (logError) {
        console.error('Failed to insert full re-evaluation log:', logError.message)
      }
    }

    return new Response(
      JSON.stringify({ success: true, grade, total_score: totalScore }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error)

    try {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
      const { answer_sheet_id } = await req.clone().json()
      if (answer_sheet_id) {
        await supabase.from('answer_sheets').update({
          status: 'error',
          remarks: `Failed: ${error.message}`
        }).eq('id', answer_sheet_id)
      }
    } catch (e) {}

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
