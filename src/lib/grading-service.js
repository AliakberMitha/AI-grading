// AI Grading Service
// This module handles AI-powered grading using Gemini API
// Can be used both client-side and in Edge Functions

import { supabase } from './supabase'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

/**
 * Calculate the grade based on percentage score
 */
export const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B+'
  if (percentage >= 60) return 'B'
  if (percentage >= 50) return 'C+'
  if (percentage >= 40) return 'C'
  if (percentage >= 33) return 'D'
  return 'F'
}

/**
 * Build the grading prompt for Gemini API
 */
export const buildGradingPrompt = (config) => {
  const {
    questionPaperContent,
    answerSheetUrl,
    maxMarks,
    contentWeightage,
    languageWeightage,
    strictnessLevel,
    gradingInstructions
  } = config

  const strictnessDescription = 
    strictnessLevel <= 30 ? 'lenient (give benefit of doubt)' :
    strictnessLevel <= 60 ? 'moderate (balanced evaluation)' :
    'strict (precise marking, penalize errors)'

  return `You are an expert academic examiner tasked with grading student answer sheets. 

## GRADING PARAMETERS
- **Maximum Marks**: ${maxMarks}
- **Content Weightage**: ${contentWeightage}% (accuracy, completeness, relevance)
- **Language Weightage**: ${languageWeightage}% (grammar, clarity, presentation)
- **Strictness Level**: ${strictnessLevel}/100 (${strictnessDescription})

## QUESTION PAPER REFERENCE
${questionPaperContent || 'Use your best judgment based on the visible questions in the answer sheet.'}

## ADDITIONAL INSTRUCTIONS
${gradingInstructions || 'Evaluate based on standard academic criteria.'}

## YOUR TASK
Analyze the provided answer sheet image/PDF and provide:

1. **Content Score**: Out of ${(maxMarks * contentWeightage / 100).toFixed(1)} marks
   - Evaluate accuracy of answers
   - Check completeness of responses
   - Assess understanding of concepts

2. **Language Score**: Out of ${(maxMarks * languageWeightage / 100).toFixed(1)} marks
   - Grammar and spelling
   - Clarity of expression
   - Logical flow and organization

3. **Detailed Remarks**: 
   - Specific feedback on each answer
   - What was done well
   - Areas needing improvement

4. **Issues Array**: List specific problems found (max 5 items)

## RESPONSE FORMAT (JSON ONLY)
Respond ONLY with valid JSON in this exact format:
{
  "content_score": <number>,
  "language_score": <number>,
  "total_score": <number>,
  "grade": "<letter grade>",
  "remarks": "<detailed feedback string>",
  "issues": ["issue 1", "issue 2", ...]
}

IMPORTANT: 
- Ensure total_score = content_score + language_score
- Grade should be one of: A+, A, B+, B, C+, C, D, F
- Be consistent with the strictness level specified
- Only return the JSON object, no other text`
}

/**
 * Call Gemini API for grading
 */
export const callGeminiAPI = async (prompt, imageUrl) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: await fetchImageAsBase64(imageUrl)
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 2048
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Gemini API request failed')
  }

  const data = await response.json()
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!textResponse) {
    throw new Error('No response from Gemini API')
  }

  // Parse JSON from response
  const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Invalid response format from Gemini API')
  }

  return JSON.parse(jsonMatch[0])
}

/**
 * Fetch image and convert to base64
 */
const fetchImageAsBase64 = async (url) => {
  const response = await fetch(url)
  const blob = await response.blob()
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Main grading function - grades an answer sheet
 */
export const gradeAnswerSheet = async (answerSheetId) => {
  try {
    // 1. Fetch answer sheet details
    const { data: answerSheet, error: fetchError } = await supabase
      .from('answer_sheets')
      .select(`
        *,
        question_papers (
          id, title, total_marks, file_url, instructions,
          class_id, subject_id
        )
      `)
      .eq('id', answerSheetId)
      .single()

    if (fetchError) throw fetchError

    // 2. Update status to processing
    await supabase
      .from('answer_sheets')
      .update({ status: 'processing' })
      .eq('id', answerSheetId)

    // 3. Fetch academic level settings
    const { data: academicLevel } = await supabase
      .from('academic_levels')
      .select('*')
      .eq('class_id', answerSheet.class_id)
      .eq('subject_id', answerSheet.subject_id)
      .single()

    const academicWeightage = academicLevel?.weightage || {}
    const rawContentWeightage = Number(academicWeightage?.content)
    const rawLanguageWeightage = Number(academicWeightage?.language)

    let resolvedContentWeightage = Number.isFinite(rawContentWeightage) ? rawContentWeightage : null
    let resolvedLanguageWeightage = Number.isFinite(rawLanguageWeightage) ? rawLanguageWeightage : null

    if (resolvedContentWeightage === null && resolvedLanguageWeightage === null) {
      resolvedContentWeightage = 60
      resolvedLanguageWeightage = 40
    } else if (resolvedContentWeightage === null) {
      resolvedContentWeightage = Math.max(0, 100 - resolvedLanguageWeightage)
    } else if (resolvedLanguageWeightage === null) {
      resolvedLanguageWeightage = Math.max(0, 100 - resolvedContentWeightage)
    }

    const weightageSum = resolvedContentWeightage + resolvedLanguageWeightage
    if (weightageSum <= 0) {
      resolvedContentWeightage = 60
      resolvedLanguageWeightage = 40
    } else if (weightageSum !== 100) {
      const normalizedContent = (resolvedContentWeightage / weightageSum) * 100
      resolvedContentWeightage = Number(normalizedContent.toFixed(2))
      resolvedLanguageWeightage = Number((100 - resolvedContentWeightage).toFixed(2))
    }

    const academicMaxMarks = Number(academicLevel?.max_marks)
    const questionPaperMaxMarks = Number(answerSheet.question_papers?.total_marks)
    const resolvedMaxMarks = Number.isFinite(academicMaxMarks) && academicMaxMarks > 0
      ? academicMaxMarks
      : (Number.isFinite(questionPaperMaxMarks) && questionPaperMaxMarks > 0 ? questionPaperMaxMarks : 100)

    const strictnessRaw = Number(academicLevel?.strictness_level)
    const resolvedStrictness = Number.isFinite(strictnessRaw)
      ? Math.min(100, Math.max(0, strictnessRaw))
      : 50

    const config = {
      questionPaperContent: answerSheet.question_papers?.instructions || '',
      answerSheetUrl: answerSheet.file_url,
      maxMarks: resolvedMaxMarks,
      contentWeightage: resolvedContentWeightage,
      languageWeightage: resolvedLanguageWeightage,
      strictnessLevel: resolvedStrictness,
      gradingInstructions: academicLevel?.grading_instructions ?? ''
    }

    // 4. Build prompt and call Gemini
    const prompt = buildGradingPrompt(config)
    const result = await callGeminiAPI(prompt, answerSheet.file_url)

    // 5. Validate and normalize scores
    const contentScore = Math.min(result.content_score, config.maxMarks * config.contentWeightage / 100)
    const languageScore = Math.min(result.language_score, config.maxMarks * config.languageWeightage / 100)
    const totalScore = contentScore + languageScore
    const grade = calculateGrade((totalScore / config.maxMarks) * 100)

    // 6. Update answer sheet with results
    const { error: updateError } = await supabase
      .from('answer_sheets')
      .update({
        status: 'graded',
        content_score: contentScore,
        language_score: languageScore,
        total_score: totalScore,
        grade: grade,
        remarks: result.remarks || '',
        issues: result.issues || [],
        ai_response: result,
        graded_at: new Date().toISOString()
      })
      .eq('id', answerSheetId)

    if (updateError) throw updateError

    return { success: true, result }

  } catch (error) {
    console.error('Grading error:', error)

    // Update status to error
    await supabase
      .from('answer_sheets')
      .update({
        status: 'error',
        remarks: `Grading failed: ${error.message}`
      })
      .eq('id', answerSheetId)

    return { success: false, error: error.message }
  }
}

/**
 * Batch grade multiple answer sheets
 */
export const batchGradeAnswerSheets = async (answerSheetIds) => {
  const results = []
  
  for (const id of answerSheetIds) {
    const result = await gradeAnswerSheet(id)
    results.push({ id, ...result })
    
    // Add small delay between API calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return results
}
