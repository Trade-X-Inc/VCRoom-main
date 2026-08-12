import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveUid } from './_shared/auth.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')

// 11 Aug 2026 — OpenRouter/deepseek fallback REMOVED. CLAUDE.md §10 permits
// exactly one wired provider; §7.4 requires provider fallbacks to fail CLOSED
// on absent configuration, never open.
//
// This is the SECOND instance of this exact defect, not the first: the same
// `FORCE_OPENROUTER || !OPENAI_KEY` condition was found and fixed in
// review-document earlier the same day. Here the content at risk was an
// entire uploaded pitch deck — a merely-missing OPENAI_API_KEY would have
// silently routed the whole document to deepseek/deepseek-chat, with no flag
// ever deliberately set.
//
// Now fails closed: no key, no call. Do not reintroduce a fallback provider
// without a DPA and an explicit amendment to §10 — see §17's open DPA item.
function getAIConfig(_task: 'extraction' | 'fast') {
  if (!OPENAI_KEY) return null
  return {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: OPENAI_KEY,
    model: 'gpt-4o-mini',
    headers: {}
  }
}

const EXTRACTION_PROMPT = `You are extracting structured information from a startup pitch deck to populate a founder profile.

Extract the following fields. Return ONLY a valid JSON object.
If a field cannot be found, use null. Never fabricate information.

{
  "company_name": null,
  "tagline": null,
  "description": null,
  "sector": null,
  "stage": null,
  "country": null,
  "funding_target": null,
  "valuation": null,
  "problem": null,
  "solution": null,
  "why_us": null,
  "why_now": null,
  "tam": null,
  "sam": null,
  "target_customer": null,
  "revenue": null,
  "revenue_model": null,
  "growth_rate": null,
  "customer_count": null,
  "traction": null,
  "pricing": null,
  "burn_rate": null,
  "runway_months": null,
  "founder_name": null,
  "cofounder_name": null,
  "competitors": null,
  "competitive_advantage": null,
  "moat": null,
  "use_of_funds": null,
  "milestones": null,
  "current_investors": null,
  "team_size": null,
  "founded_year": null
}`

serve(async (req) => {
  const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Identity derivation moved to ./_shared/auth.ts on 11 Aug 2026 (CLAUDE.md
    // §19d.1). Same check as before (Supabase resolves the bearer token via
    // /auth/v1/user internally either way) — error message preserved exactly
    // for behavioral equivalence.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const uid = await resolveUid(req, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if (!uid) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: rateCheck } = await supabase.rpc('check_ai_rate_limit', { p_user_id: uid, p_feature: 'pitch_deck_extraction' })
    if (rateCheck && !rateCheck.allowed) return new Response(JSON.stringify({ error: `Daily limit reached. Try again tomorrow.`, rate_limited: true }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { fileBase64, fileName, mimeType } = await req.json()
    if (!fileBase64 || !fileName) return new Response(JSON.stringify({ error: 'fileBase64 and fileName required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const fileSizeBytes = (fileBase64.length * 3) / 4
    if (fileSizeBytes > 10 * 1024 * 1024) return new Response(JSON.stringify({ error: 'File too large. Maximum 10MB.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const binaryStr = atob(fileBase64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

    const isPDF = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
    const ai = getAIConfig('extraction')
    if (!ai) return new Response(JSON.stringify({ error: 'Pitch deck extraction is unavailable.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    let extracted: Record<string, unknown> = {}

    if (isPDF) {
      // PDF: use OpenAI Files API
      const formData = new FormData()
      formData.append('file', new Blob([bytes], { type: 'application/pdf' }), fileName)
      formData.append('purpose', 'assistants')
      const uploadRes = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
        body: formData
      })
      const uploadData = await uploadRes.json()
      if (uploadData.id) {
        const respRes = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', input: [{ role: 'user', content: [{ type: 'input_file', file_id: uploadData.id }, { type: 'input_text', text: EXTRACTION_PROMPT }] }] })
        })
        const respData = await respRes.json()
        await fetch(`https://api.openai.com/v1/files/${uploadData.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${OPENAI_KEY}` } })
        const content = respData.output?.[0]?.content?.[0]?.text ?? '{}'
        try { extracted = JSON.parse(content) } catch { extracted = {} }
      }
    } else {
      // PPTX path: text extraction
      const decoded = atob(fileBase64)
      const textContent = decoded.replace(/<[^>]+>/g, ' ').replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').substring(0, 15000)
      if (textContent.length < 50) return new Response(JSON.stringify({ success: false, error: 'Could not extract text. Try PPTX or fill manually.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const res = await fetch(`${ai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ai.apiKey}`, 'Content-Type': 'application/json', ...ai.headers },
        body: JSON.stringify({ model: ai.model, messages: [{ role: 'system', content: EXTRACTION_PROMPT }, { role: 'user', content: `Extract from this pitch deck:\n\n${textContent}` }], max_tokens: 2000, response_format: { type: 'json_object' } })
      })
      const data = await res.json()
      try { extracted = JSON.parse(data.choices?.[0]?.message?.content ?? '{}') } catch { extracted = {} }
    }

    return new Response(JSON.stringify({ success: true, data: extracted }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
