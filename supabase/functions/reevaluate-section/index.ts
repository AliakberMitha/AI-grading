// Supabase Edge Function: reevaluate-section
// Deploy with: supabase functions deploy reevaluate-section
// Purpose: Re-evaluate a specific section of an already graded answer sheet

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function buildSectionPrompt(section: any, config: any): string {
  const { contentWeightage, languageWeightage, strictnessLevel, gradingInstructions } = config

  const strictnessText = strictnessLevel <= 30 
    ? 'lenient (give benefit of doubt, accept partially correct answers generously)' 
    : strictnessLevel <= 60 
    ? 'moderate (balanced evaluation, fair partial marking)' 
    : 'strict (rigorous grading, exact answers required, penalize errors)'

  const sectionJson = JSON.stringify(section, null, 2)

  return `## SYSTEM ROLE
You are an expert exam grader. Re-evaluate this specific section of an answer sheet. Be fair, thorough, and provide detailed feedback.

## GRADING PARAMETERS
- Content Weightage: ${contentWeightage}%
- Language Weightage: ${languageWeightage}%
- Strictness: ${strictnessText}
${gradingInstructions ? `- Special Instructions: ${gradingInstructions}` : ''}

## SECTION TO RE-EVALUATE
${sectionJson}

## SPECIAL GRADING RULES

### MCQ (Multiple Choice Questions):
- Award FULL marks if the selected option matches the correct answer exactly
- Award ZERO marks if wrong option is selected

### Fill in the Blanks:
- Award FULL marks if the answer is correct or semantically equivalent
- Minor spelling errors acceptable for lenient/moderate, exact for strict

### True/False Questions:
- Award FULL marks for correct, ZERO for incorrect

### Attempt Limits:
- If "attempt_required" is set, only grade that many questions
- Extra answers get marks = 0, feedback = "Extra question - not graded"

## YOUR TASK

Re-grade all questions in this section. For each question:
1. Review the student_answer carefully
2. Compare with correct_answer
3. Award marks based on rubric and question type
4. Provide detailed feedback

## RESPONSE FORMAT (JSON ONLY)

{
  "section": "${section.section}",
  "section_name": "${section.section_name || 'Section ' + section.section}",
  "section_type": "${section.section_type || 'Mixed'}",
  "attempt_required": ${section.attempt_required || 'null'},
  "questions_graded": <number>,
  "questions": [
    {
      "question_number": "<number>",
      "question_text": "<the question>",
      "question_type": "<MCQ|FillBlank|TrueFalse|Short|Long|Numerical>",
      "student_answer": "<transcribed answer>",
      "correct_answer": "<expected answer>",
      "is_correct": <true|false>,
      "marks_obtained": <number>,
      "max_marks": <number>,
      "feedback": "<detailed explanation>",
      "is_extra": <true|false>
    }
  ],
  "section_total": <sum of marks>,
  "section_max": <max possible>
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

function calculateSectionTotal(section: any): number {
  if (!section) return 0
  if (typeof section.section_total === 'number') {
    return Number(section.section_total) || 0
  }
  if (Array.isArray(section.questions)) {
    return section.questions.reduce((sum: number, q: any) => {
      const marks = q?.marks_obtained
      return sum + (typeof marks === 'number' ? marks : Number(marks) || 0)
    }, 0)
  }
  return 0
}

function parseJSON(text: string): any {
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  let jsonStr = codeMatch ? codeMatch[1].trim() : text
  
  if (!codeMatch) {
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (jsonMatch) jsonStr = jsonMatch[0]
  }

  try {
    return JSON.parse(jsonStr)
  } catch (e) {}

  let fixed = jsonStr
    .replace(/,(\s*[\]\}])/g, '$1')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\n/g, ' ')
  
  try {
    return JSON.parse(fixed)
  } catch (e) {
    throw new Error('Failed to parse AI response')
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const { answer_sheet_id, section_index, requested_by } = await req.json()

    const sectionIdx = Number(section_index)
    if (!Number.isFinite(sectionIdx)) {
      throw new Error('section_index must be a number')
    }

    if (!answer_sheet_id || section_index === undefined) {
      throw new Error('answer_sheet_id and section_index are required')
    }

    console.log('Re-evaluating section:', sectionIdx, 'of sheet:', answer_sheet_id)

    // Fetch answer sheet
    const { data: sheet, error: fetchErr } = await supabase
      .from('answer_sheets')
      .select(`*, question_papers (id, title, total_marks, file_url, extracted_questions, class_id, subject_id)`)
      .eq('id', answer_sheet_id)
      .single()

    if (fetchErr) throw fetchErr
    if (!sheet) throw new Error('Answer sheet not found')
    if (!sheet.section_wise_results || !sheet.section_wise_results[sectionIdx]) {
      throw new Error('Section not found in results')
    }

    const qp = sheet.question_papers
    const currentSection = sheet.section_wise_results[sectionIdx]

    const previousTotals = {
      total: typeof sheet.total_score === 'number' ? Number(sheet.total_score) : null,
      grade: sheet.grade || null,
      sectionScore: calculateSectionTotal(currentSection)
    }

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

    // Build prompt for section re-evaluation
    const prompt = buildSectionPrompt(currentSection, config)

    // Call Gemini with answer sheet image (with model fallback)
    const asBase64 = await fetchImageAsBase64(sheet.file_url)
    
    // List of Gemini models to try in order (all support vision)
    const GEMINI_MODELS = [
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-002',
      'gemini-1.5-flash-002'
    ]

    let newSectionResult: any = null
    let lastError: Error | null = null

    for (const model of GEMINI_MODELS) {
      try {
        console.log(`Trying model: ${model}`)
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: getMimeType(sheet.file_url), data: asBase64 } }
                ]
              }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
            })
          }
        )

        if (!response.ok) {
          const err = await response.json()
          const errorMsg = err.error?.message || 'Gemini API failed'
          console.warn(`Model ${model} failed: ${errorMsg}`)
          
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
        newSectionResult = parseJSON(text)
        break
        
      } catch (e: any) {
        console.warn(`Model ${model} error: ${e.message}`)
        lastError = e
      }
    }

    if (!newSectionResult) {
      throw lastError || new Error('All Gemini models failed')
    }

    const newSectionScore = calculateSectionTotal(newSectionResult)

    // Update section in results array
    const updatedResults = [...sheet.section_wise_results]
    updatedResults[sectionIdx] = newSectionResult

    // Recalculate totals
    let newTotal = 0
    for (const section of updatedResults) {
      if (section.questions) {
        for (const q of section.questions) {
          if (!q.is_extra) {
            newTotal += q.marks_obtained || 0
          }
        }
      } else if (section.section_total) {
        newTotal += section.section_total
      }
    }
    newTotal = Math.min(newTotal, config.maxMarks)

    const contentScore = newTotal * config.contentWeightage / 100
    const languageScore = newTotal * config.languageWeightage / 100
    
    // Calculate grade
    const percentage = (newTotal / config.maxMarks) * 100
    let grade = 'F'
    if (percentage >= 90) grade = 'A+'
    else if (percentage >= 80) grade = 'A'
    else if (percentage >= 70) grade = 'B+'
    else if (percentage >= 60) grade = 'B'
    else if (percentage >= 50) grade = 'C+'
    else if (percentage >= 40) grade = 'C'
    else if (percentage >= 33) grade = 'D'

    const sectionName = newSectionResult.section_name || currentSection.section_name || null

    // Update answer sheet
    const { error: updateError } = await supabase.from('answer_sheets').update({
      section_wise_results: updatedResults,
      content_score: contentScore,
      language_score: languageScore,
      total_score: newTotal,
      grade,
      is_re_evaluated: true,
      re_evaluation_count: (sheet.re_evaluation_count || 0) + 1,
      graded_at: new Date().toISOString()
    }).eq('id', answer_sheet_id)

    if (updateError) throw updateError

    const previousQuestionMarks = Array.isArray(currentSection?.questions)
      ? currentSection.questions.map((q: any) => ({
          question_number: q?.question_number,
          marks_obtained: q?.marks_obtained
        }))
      : []

    const newQuestionMarks = Array.isArray(newSectionResult?.questions)
      ? newSectionResult.questions.map((q: any) => ({
          question_number: q?.question_number,
          marks_obtained: q?.marks_obtained
        }))
      : []

    const { error: logError } = await supabase.from('re_evaluation_logs').insert({
      answer_sheet_id,
      evaluation_type: 'section',
      section_index: sectionIdx,
      section_name: sectionName,
      previous_total_score: previousTotals.total,
      previous_section_score: previousTotals.sectionScore,
      new_total_score: newTotal,
      new_section_score: newSectionScore,
      previous_grade: previousTotals.grade,
      new_grade: grade,
      triggered_by: requested_by || sheet.graded_by || null,
      details: {
        previous_question_marks: previousQuestionMarks,
        new_question_marks: newQuestionMarks
      }
    })

    if (logError) {
      console.error('Failed to insert section re-evaluation log:', logError.message)
    }

    console.log('Section re-evaluated. New total:', newTotal, 'Grade:', grade)

    return new Response(
      JSON.stringify({ 
        success: true, 
        section: newSectionResult,
        total_score: newTotal,
        grade 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
