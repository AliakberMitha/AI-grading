// @ts-nocheck

// Supabase Edge Function: list-re-evaluation-logs
// Returns paginated re-evaluation history for admins

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables for list-re-evaluation-logs')
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing')
    }

    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData?.user) {
      console.error('Auth validation failed:', authError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const userId = authData.user.id

    // Ensure the caller is an admin
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError.message)
      throw profileError
    }

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    let body: { type?: string | null } = {}
    try {
      body = await req.json()
    } catch (_) {
      // ignore - optional body
    }

    const typeFilter = body?.type || null

    let query = supabase
      .from('re_evaluation_logs')
      .select(`
        id,
        evaluation_type,
        section_index,
        section_name,
        previous_total_score,
        previous_section_score,
        new_total_score,
        new_section_score,
        previous_grade,
        new_grade,
        details,
        created_at,
        answer_sheets (
          id,
          total_score,
          grade,
          extracted_roll_number,
          roll_number_confidence,
          question_papers (
            id,
            title
          ),
          students (
            id,
            name,
            roll_number
          )
        ),
        triggered_by_user:users (
          id,
          itsid,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (typeFilter && (typeFilter === 'full' || typeFilter === 'section')) {
      query = query.eq('evaluation_type', typeFilter)
    }

    const { data, error } = await query
    if (error) {
      console.error('Failed to fetch re-evaluation logs:', error.message)
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('Unexpected error in list-re-evaluation-logs:', error?.message || error)
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unexpected error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
