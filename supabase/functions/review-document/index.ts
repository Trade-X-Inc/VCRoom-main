import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveUid } from './_shared/auth.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')

// 11 Aug 2026 — OpenRouter/deepseek-r1 fallback REMOVED. CLAUDE.md §10 permits
// exactly one wired provider; this function receives founder financial and
// cap-table document content, and silently rerouting that to an unapproved
// provider (on nothing more than a missing OPENAI_API_KEY) was a live violation
// of that rule, not an open question. This now fails closed: no key, no call.
// Do not reintroduce a fallback provider here without a DPA and an explicit
// amendment to §10 — see §17's still-open DPA item.
function getAIConfig(_task: 'review') {
  if (!OPENAI_KEY) return null
  return { baseUrl: 'https://api.openai.com/v1', apiKey: OPENAI_KEY, model: 'gpt-4o-mini', headers: {} }
}

const STAGE_CONTEXT: Record<string, string> = {
  'pre-seed': 'Pre-seed: focus on team, problem clarity, early validation.',
  'seed': 'Seed: expect traction signals, working product, defined market, solid team.',
  'series-a': 'Series A: proven unit economics, clear path to scale, 3x YoY growth minimum.',
  'series-b': 'Series B: market leadership, efficient growth, institutional-grade financials.'
}

const DOCUMENT_REVIEW_PROMPTS: Record<string, string> = {
  'problem-solution': 'Review Problem & Solution: clarity, specificity, team-problem fit, timing. Flag generic language, missing customer evidence.',
  'market-sizing': 'Review Market Sizing: TAM credibility (source?), SAM relevance, methodology. Flag missing sources, vague sizing.',
  'financial-model': 'Review Financial Model: projection realism, burn sustainability, runway, unit economics. Flag missing assumptions, unrealistic growth, runway under 12 months.',
  'cap-table': 'Review Cap Table: founder ownership, option pool, concentration. Flag founder below 60% at seed, missing option pool.',
  'traction-summary': 'Review Traction: metric credibility, growth context, customer quality. Flag vanity metrics, flat growth, no MoM context.',
  'team-bios': 'Review Team: founder-market fit, skills, domain expertise. Flag missing technical lead, no domain expertise.',
  'business-model': 'Review Business Model: revenue clarity, pricing, unit economics. Flag vague model, CAC > LTV.',
  'competitive-landscape': 'Review Competitive Landscape: honesty, differentiation specificity, moat. Flag claiming no competitors, generic differentiation.',
  'use-of-funds': 'Review Use of Funds: allocation logic, milestone achievability. Flag no clear milestone, vague line items.',
  'product-roadmap': 'Review Product Roadmap: milestone specificity, achievability, customer validation. Flag feature overload, unrealistic timelines.',
  'customer-references': 'Review Customer References: quality, concentration risk, churn. Flag no named customers, heavy concentration.',
  'tech-stack-overview': 'Review Tech Stack: scalability, IP ownership, technical debt. Flag heavy third-party dependency for core functionality.'
}

serve(async (req) => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    // Identity derivation moved to ./_shared/auth.ts on 11 Aug 2026 (CLAUDE.md
    // §19d.1). Same check as before — error message preserved exactly for
    // behavioral equivalence.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const uid = await resolveUid(req, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if (!uid) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: rateCheck } = await supabase.rpc('check_ai_rate_limit', { p_user_id: uid, p_feature: 'ai_advisor' })
    if (rateCheck && !rateCheck.allowed) return new Response(JSON.stringify({ error: 'Daily review limit reached.', rate_limited: true }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { templateSlug, content, stage } = await req.json()
    if (!templateSlug || !content) return new Response(JSON.stringify({ error: 'templateSlug and content required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const contentText = Object.entries(content).filter(([,v]) => v && String(v).trim()).map(([k,v]) => `${k.replace(/_/g,' ').toUpperCase()}:\n${v}`).join('\n\n')
    if (!contentText || contentText.length < 20) return new Response(JSON.stringify({ success: true, feedback: { overall_score: 0, signal: 'empty', summary: 'Fill in the fields first.', strengths: [], gaps: ['Document is empty'], recommendations: ['Fill all required fields first'] } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const ai = getAIConfig('review')
    if (!ai) return new Response(JSON.stringify({ error: 'Document review is unavailable.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const stageContext = STAGE_CONTEXT[stage?.toLowerCase() ?? 'seed'] ?? STAGE_CONTEXT['seed']
    const reviewPrompt = DOCUMENT_REVIEW_PROMPTS[templateSlug] ?? 'Review this document for investment readiness.'
    const systemPrompt = `You are a senior VC analyst. Give founders honest, specific, actionable feedback.\n${stageContext}\n${reviewPrompt}\nReturn ONLY valid JSON:\n{\n  "overall_score": <1-10>,\n  "signal": <"strong"|"adequate"|"weak"|"critical">,\n  "summary": <2-3 sentences>,\n  "strengths": [<up to 3, under 15 words each>],\n  "gaps": [<up to 5, under 20 words each>],\n  "recommendations": [<up to 4, under 25 words each>],\n  "investor_flag": <single most important pushback or null>\n}\nBe harsh but fair. No validation. Flag real issues.`
    const response = await fetch(`${ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ai.apiKey}`, 'Content-Type': 'application/json', ...ai.headers },
      body: JSON.stringify({ model: ai.model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Review:\n\n${contentText}` }], max_tokens: 1000, response_format: { type: 'json_object' } })
    })
    const data = await response.json()
    let feedback: Record<string, unknown>
    try { feedback = JSON.parse(data.choices?.[0]?.message?.content ?? '{}') } catch { feedback = { error: 'Parse error' } }
    return new Response(JSON.stringify({ success: true, feedback }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
