// Supabase Edge Function: extract-questions
// Deploy with: supabase functions deploy extract-questions
// Purpose: Extract questions from question paper and save to database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

/**
 * Build prompt for question extraction with detailed rubric
 */
function buildExtractionPrompt(): string {
  return `You are an expert at extracting questions from exam papers. Extract all questions with their marks, create a detailed rubric for grading each question, and determine the maximum marks for the paper.

## SYSTEM ROLE
You are an expert at extracting questions from exam papers. Extract all questions with their marks, create a detailed rubric for grading each question, and determine the maximum marks for the paper. Note: The maximum marks may be less than the sum of all questions if students have a choice of which questions to answer.

## YOUR TASK
Extract all questions from this exam paper. For each question, provide:
- Question number
- Question text (complete, word for word)
- Marks allocated
- A detailed grading rubric with specific marking criteria
- Expected answer or key points (if inferable)

Also extract the maximum marks a student can score on this exam.

## EXTRACTION RULES

1. Extract EVERY question - do not skip any
2. For MCQs, include all options (A, B, C, D) and correct answer
3. For each question, identify the marks allocated
4. If a question has sub-parts (a, b, c), treat each as separate with its marks
5. Include any "OR" alternative questions
6. Note any choice instructions (e.g., "Attempt any 5 out of 7")
7. Create a DETAILED RUBRIC for each question with marking breakdown
8. Identify question types: MCQ, Short, Long, Numerical, Descriptive, Diagram, etc.

## RUBRIC GUIDELINES
For each question, create marking criteria like:
- Full marks: What is needed for complete answer
- Partial marks: Breakdown of points (e.g., "2 marks for definition, 3 marks for explanation")
- Zero marks: What leads to no marks
- Common mistakes to penalize

## RESPONSE FORMAT (JSON ONLY)

{
  "title": "<paper title or subject>",
  "total_marks": <maximum marks a student can score>,
  "sum_of_all_marks": <sum of all question marks - may differ if choices exist>,
  "duration": "<time allowed or null>",
  "instructions": ["<instruction 1>", "<instruction 2>"],
  "has_question_choices": <true if student can choose which questions to answer>,
  "sections": [
    {
      "section": "A",
      "section_name": "<name like 'Multiple Choice Questions'>",
      "total_marks": <marks for this section>,
      "instructions": "<section specific instructions or null>",
      "attempt_required": <number of questions to attempt or null>,
      "questions": [
        {
          "question_number": "1",
          "question_text": "<full question text - word for word>",
          "options": ["A) option1", "B) option2"] | null,
          "correct_answer": "<answer if known or inferable>" | null,
          "expected_answer": "<detailed expected answer for subjective questions>" | null,
          "key_points": ["<key point 1>", "<key point 2>"] | null,
          "marks": <marks for this question>,
          "question_type": "MCQ|Short|Long|Numerical|Descriptive|Diagram|FillBlank|TrueFalse",
          "rubric": {
            "full_marks": "<what earns full marks>",
            "marking_scheme": [
              {"points": 2, "criteria": "<what earns these points>"},
              {"points": 1, "criteria": "<what earns this point>"}
            ],
            "deductions": ["<common mistakes to penalize>"],
            "zero_marks": "<what leads to zero marks>"
          },
          "is_optional": false,
          "or_question": null | {
            "question_number": "1 OR",
            "question_text": "<alternative question>",
            "marks": <marks>,
            "rubric": { ... }
          }
        }
      ]
    }
  ],
  "extraction_notes": ["<any notes about unclear parts>"]
}

## IMPORTANT
- Return ONLY valid JSON, no other text
- The rubric is CRITICAL for accurate grading - be detailed
- If marks are not visible, estimate based on question type
- Be thorough - every question and its rubric matters for accurate grading
- Maximum marks may be less than sum of all questions if choices exist`
}

/**
 * Fetch image and convert to base64
 */
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

/**
 * Determine MIME type from URL
 */
function getMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase()?.split('?')[0]
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp'
  }
  return mimeTypes[ext || ''] || 'image/jpeg'
}

/**
 * Parse and repair JSON from AI response
 */
function parseAndRepairJSON(text: string): any {
  console.log('Raw AI response (first 2000 chars):', text.substring(0, 2000))
  
  let jsonStr = text
  
  // Try to find JSON block - handle markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
    console.log('Found JSON in code block')
  } else {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }
  }

  // Try parsing as-is
  try {
    return JSON.parse(jsonStr)
  } catch (e: any) {
    console.log('Initial JSON parse failed:', e.message)
  }

  // Repair common issues
  let repaired = jsonStr
  repaired = repaired.replace(/,(\s*[\]\}])/g, '$1')
  repaired = repaired.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  try {
    return JSON.parse(repaired)
  } catch (e: any) {
    console.log('Repair attempt 1 failed:', e.message)
  }

  // Find balanced braces
  try {
    let depth = 0
    let lastValidEnd = -1
    let inString = false
    let escapeNext = false

    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i]
      if (escapeNext) { escapeNext = false; continue }
      if (char === '\\') { escapeNext = true; continue }
      if (char === '"') { inString = !inString; continue }
      if (!inString) {
        if (char === '{' || char === '[') depth++
        else if (char === '}' || char === ']') {
          depth--
          if (depth === 0 && char === '}') lastValidEnd = i
        }
      }
    }

    if (lastValidEnd > 0) {
      return JSON.parse(repaired.substring(0, lastValidEnd + 1))
    }
  } catch (e: any) {
    console.log('Balanced brace repair failed:', e.message)
  }

  console.error('All JSON repair attempts failed. Response:', text.substring(0, 5000))
  throw new Error('Could not parse AI response as JSON')
}

// List of Gemini models to try in order (fallback support - all support vision)
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-002',
  'gemini-1.5-flash-002'
]

/**
 * Call Gemini API to extract questions with model fallback
 */
async function extractQuestionsWithGemini(fileUrl: string): Promise<any> {
  const prompt = buildExtractionPrompt()
  
  const base64 = await fetchImageAsBase64(fileUrl)
  const mimeType = getMimeType(fileUrl)

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
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64 } }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              topP: 0.8,
              maxOutputTokens: 8192
            }
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        const errorMsg = error.error?.message || 'Gemini API request failed'
        console.warn(`Model ${model} failed: ${errorMsg}`)
        
        // If overloaded or quota exceeded, try next model
        if (errorMsg.includes('overloaded') || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
          lastError = new Error(errorMsg)
          continue
        }
        
        throw new Error(errorMsg)
      }

      const data = await response.json()
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!textResponse) {
        console.warn(`Model ${model} returned empty response, trying next...`)
        lastError = new Error('No response from Gemini API')
        continue
      }

      console.log(`Success with model: ${model}`)
      console.log('Raw response length:', textResponse.length)
      return parseAndRepairJSON(textResponse)
      
    } catch (e: any) {
      console.warn(`Model ${model} error: ${e.message}`)
      lastError = e
      // Continue to next model
    }
  }

  // All models failed
  throw lastError || new Error('All Gemini models failed')
}

/**
 * Calculate total questions count
 */
function countQuestions(extracted: any): number {
  let count = 0
  if (extracted.sections) {
    for (const section of extracted.sections) {
      count += section.questions?.length || 0
    }
  }
  return count
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    
    const { question_paper_id } = await req.json()

    if (!question_paper_id) {
      throw new Error('question_paper_id is required')
    }

    console.log(`Extracting questions from paper: ${question_paper_id}`)

    // 1. Fetch question paper
    const { data: paper, error: fetchError } = await supabase
      .from('question_papers')
      .select('*')
      .eq('id', question_paper_id)
      .single()

    if (fetchError) throw fetchError
    if (!paper) throw new Error('Question paper not found')

    console.log('Question paper URL:', paper.file_url)

    // 2. Update status to processing
    await supabase
      .from('question_papers')
      .update({ 
        extraction_status: 'processing',
        extraction_error: null 
      })
      .eq('id', question_paper_id)

    // 3. Extract questions using Gemini
    const extracted = await extractQuestionsWithGemini(paper.file_url)

    console.log('Extraction complete. Sections:', extracted.sections?.length)
    console.log('Total questions:', countQuestions(extracted))

    // 4. Update question paper with extracted data
    const { error: updateError } = await supabase
      .from('question_papers')
      .update({
        extracted_questions: extracted,
        extraction_status: 'completed',
        extraction_error: null,
        // Update total_marks if extracted
        ...(extracted.total_marks && { total_marks: extracted.total_marks })
      })
      .eq('id', question_paper_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ 
        success: true, 
        sections: extracted.sections?.length || 0,
        questions: countQuestions(extracted),
        total_marks: extracted.total_marks
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Extraction error:', error)

    // Update status to error
    try {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
      const { question_paper_id } = await req.clone().json()
      
      if (question_paper_id) {
        await supabase
          .from('question_papers')
          .update({
            extraction_status: 'error',
            extraction_error: error.message
          })
          .eq('id', question_paper_id)
      }
    } catch (e) {
      console.error('Failed to update error status:', e)
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
