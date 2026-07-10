import { createServerFn } from "@tanstack/react-start";

function getOpenAIKey(): string {
  const cfEnv = (globalThis as any).__cf_env || {};
  return (
    cfEnv.OPENAI_API_KEY ||
    cfEnv.OPEN_AI_API_KEY ||
    cfEnv["OPEN AI API KEY"] ||
    (typeof process !== "undefined" ? process.env.OPENAI_API_KEY : "") ||
    ""
  ) as string;
}

const EXTRACTION_SCHEMA = `{
  "company_name": "string or null",
  "tagline": "string or null",
  "sector": "string or null",
  "stage": "string or null",
  "problem": "string or null",
  "solution": "string or null",
  "business_model": "string or null",
  "market_size": "string or null",
  "traction": "string or null",
  "team": [{"name": "string", "role": "string"}],
  "funding_target": "string or null",
  "use_of_funds": "string or null",
  "competitive_advantage": "string or null",
  "missing_fields": ["array of field names not found"]
}`;

async function callOpenAI(systemPrompt: string, userMessage: string, maxTokens = 1200): Promise<string> {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error("OpenAI API key not configured on server");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as any;
    throw new Error(err?.error?.message || `OpenAI error ${response.status}`);
  }
  const result = await response.json() as any;
  const content = result.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("AI returned empty response");
  return content;
}

function parseExtractionJSON(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

// ── Extract from document text ────────────────────────────────────────────────
type DocumentExtractInput = {
  userId: string;
  documentText: string;
};

type ExtractionResult = {
  data: Record<string, unknown> | null;
  missing_fields: string[];
  error: string | null;
};

export const extractProfileFromDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as DocumentExtractInput)
  .handler(async ({ data }): Promise<ExtractionResult> => {
    const systemPrompt = `You are an expert at extracting structured startup data from pitch decks and documents.
Return ONLY valid JSON — no markdown, no explanation, no extra text.
The JSON must exactly match this schema:
${EXTRACTION_SCHEMA}

Rules:
- Only fill a field if there is clear textual evidence in the document.
- Do NOT guess, invent, or fabricate any data.
- For any field you cannot find evidence for, set it to null and add its key to missing_fields.
- team is an array of {name, role} objects. If no team info found, set to [].
- missing_fields must list every key that is null or empty.`;

    const userMessage = `Extract structured startup profile data from this document content:

${data.documentText.slice(0, 12000)}`;

    try {
      const raw = await callOpenAI(systemPrompt, userMessage, 1200);
      try {
        const parsed = parseExtractionJSON(raw);
        const missing = Array.isArray(parsed.missing_fields) ? parsed.missing_fields as string[] : [];
        return { data: parsed, missing_fields: missing, error: null };
      } catch {
        // Retry with stricter prompt
        const raw2 = await callOpenAI(
          systemPrompt + "\n\nCRITICAL: Return ONLY the raw JSON object. No markdown, no backticks, no explanation whatsoever.",
          userMessage,
          1200
        );
        const parsed = parseExtractionJSON(raw2);
        const missing = Array.isArray(parsed.missing_fields) ? parsed.missing_fields as string[] : [];
        return { data: parsed, missing_fields: missing, error: null };
      }
    } catch (err: any) {
      return { data: null, missing_fields: [], error: err.message };
    }
  });

// ── Extract from interview transcript ─────────────────────────────────────────
type InterviewExtractInput = {
  userId: string;
  transcript: string;
};

export const extractProfileFromInterview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as InterviewExtractInput)
  .handler(async ({ data }): Promise<ExtractionResult> => {
    const systemPrompt = `You are an expert at converting founder interview conversations into structured startup profile data.
Return ONLY valid JSON — no markdown, no explanation, no extra text.
The JSON must exactly match this schema:
${EXTRACTION_SCHEMA}

Rules:
- Use the founder's own words where possible — do not embellish or add claims they did not make.
- Only fill a field if the founder explicitly stated it.
- For any field not covered in the conversation, set it to null and add its key to missing_fields.
- team is an array of {name, role} objects.
- missing_fields must list every key that is null or empty.`;

    const userMessage = `Convert this founder interview into structured profile data:

${data.transcript}`;

    try {
      const raw = await callOpenAI(systemPrompt, userMessage, 1200);
      try {
        const parsed = parseExtractionJSON(raw);
        const missing = Array.isArray(parsed.missing_fields) ? parsed.missing_fields as string[] : [];
        return { data: parsed, missing_fields: missing, error: null };
      } catch {
        const raw2 = await callOpenAI(
          systemPrompt + "\n\nCRITICAL: Return ONLY the raw JSON object. No markdown, no backticks, no explanation whatsoever.",
          userMessage,
          1200
        );
        const parsed = parseExtractionJSON(raw2);
        const missing = Array.isArray(parsed.missing_fields) ? parsed.missing_fields as string[] : [];
        return { data: parsed, missing_fields: missing, error: null };
      }
    } catch (err: any) {
      return { data: null, missing_fields: [], error: err.message };
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Interview v3 — sector-aware and stage-aware question tree.
//
// Phase 1 (everyone, 4 questions) → Phase 2 (4 questions branched on stage)
// → Phase 3 (2 questions branched on sector). 10 main questions total, at
// most 2 clarifying follow-ups across the whole interview (12 hard cap).
// Conduct: one question at a time, acknowledge each answer, never argue.
// ─────────────────────────────────────────────────────────────────────────────

type InterviewQuestionInput = {
  userId: string;
  history: Array<{ role: "ai" | "founder"; content: string }>;
  questionIndex: number;
  companyName?: string;
};

type InterviewQuestionResult = {
  question: string;
  isFollowUp: boolean;
  isDone: boolean;
  error: string | null;
};

type StageKey = "pre_revenue" | "early_revenue" | "growing";
type SectorKey =
  | "fintech" | "deeptech" | "saas" | "healthtech" | "agritech"
  | "cleantech" | "logistics" | "edtech" | "ecommerce" | "other";

function classifyStage(answer: string): StageKey {
  const a = answer.toLowerCase();
  if (/(pre[- ]?revenue|idea|concept|no revenue|not launched|pre[- ]?launch)/.test(a)) return "pre_revenue";
  if (/(scal|growth|growing|series [ab]|expand)/.test(a)) return "growing";
  return "early_revenue";
}

function classifySector(answer: string): SectorKey {
  const a = answer.toLowerCase();
  if (/fin(tech)?|payment|banking|lending|insur/.test(a)) return "fintech";
  if (/deep ?tech|robot|hardware|semiconductor|space|biotech(?!.*health)|quantum|ai chip/.test(a)) return "deeptech";
  if (/saas|software|b2b tool|platform/.test(a)) return "saas";
  if (/health|medical|med(tech)?|pharma|clinic|diagnos/.test(a)) return "healthtech";
  if (/agri|farm|food production|crop/.test(a)) return "agritech";
  if (/clean|climate|carbon|solar|energy|sustainab/.test(a)) return "cleantech";
  if (/logisti|freight|shipping|supply chain|delivery|fulfillment/.test(a)) return "logistics";
  if (/ed(u|tech)|learning|school|training/.test(a)) return "edtech";
  if (/e-?commerce|marketplace|retail|d2c|dtc|consumer brand/.test(a)) return "ecommerce";
  return "other";
}

const PHASE2: Record<StageKey, string[]> = {
  pre_revenue: [
    "What problem are you solving and who specifically has this problem? Give me a real example of a customer you've spoken to.",
    "What's your unfair advantage — why will you win over the next competitor to enter this space?",
    "Who is on your founding team and what makes them the right people to solve this?",
    "What does your path to first revenue look like and when do you expect it?",
  ],
  early_revenue: [
    "What is your current MRR or ARR and how has it trended over the last 3 months?",
    "Describe your average customer — who are they, how did you find them, and what do they pay?",
    "What does your cost structure look like — what are your main expenses?",
    "What specifically will the funding enable that you cannot do today?",
  ],
  growing: [
    "What are your key metrics? MRR, growth rate, churn, CAC, LTV — give me the real numbers.",
    "What is your go-to-market strategy and what's working versus what you're still figuring out?",
    "What does your competitive landscape look like and how do you win against the alternatives?",
    "What does your team look like and what key hires are you planning with this round?",
  ],
};

const PHASE3: Record<SectorKey, string[]> = {
  fintech: [
    "Are you regulated? What licenses do you hold or plan to obtain, and in which jurisdictions?",
    "How do you handle fraud risk and what is your current fraud rate?",
  ],
  deeptech: [
    "What is the core IP — do you have patents filed or granted, and what specifically do they cover?",
    "What is your hardware unit economics — what does it cost to manufacture and what do you sell it for?",
  ],
  saas: [
    "What is your net revenue retention rate and how does it trend as customers mature?",
    "What does your sales cycle look like and who in the customer organization signs the contract?",
  ],
  healthtech: [
    "What regulatory pathway are you on (FDA, CE, CDSCO, etc.) and where are you in that process?",
    "Are you selling to hospitals, payers, or patients directly — and who actually pays?",
  ],
  agritech: [
    "What is your distribution model — do you sell direct to farmers or through aggregators?",
    "What is the seasonal revenue pattern and how do you manage working capital through off-seasons?",
  ],
  cleantech: [
    "What is your carbon impact claim and how is it measured and verified?",
    "Are you dependent on government subsidies or regulatory mandates to be economically viable?",
  ],
  logistics: [
    "Do you own assets (vehicles, warehouses) or run an asset-light model — and what does that mean for your margins?",
    "What are your unit economics per shipment or delivery, and how do they change with density?",
  ],
  edtech: [
    "Who pays — institutions, parents, or learners — and how long is the sales cycle for that buyer?",
    "What are your engagement and completion rates, and how do they compare to your category?",
  ],
  ecommerce: [
    "What are your contribution margins after shipping, returns, and acquisition costs?",
    "What is your repeat purchase rate and what share of revenue comes from returning customers?",
  ],
  other: [
    "What is the single metric that best proves your business is working, and where is it today?",
    "What is the biggest risk to this business in the next 12 months and how are you handling it?",
  ],
};

/** Build the full ordered plan of 10 main questions from what's known so far. */
function buildQuestionPlan(companyName: string | undefined, stage: StageKey, sector: SectorKey): string[] {
  const name = companyName?.trim() || "your company";
  return [
    `What does ${name} do? Describe it in one sentence as if explaining to someone who doesn't know your industry.`,
    "What stage are you at? (Pre-revenue idea / Early revenue / Growing revenue / Scaling / Other)",
    "What sector are you in? (Fintech / DeepTech / SaaS / HealthTech / AgriTech / CleanTech / Logistics / EdTech / E-commerce / Other)",
    "How much are you looking to raise, and what will you use it for?",
    ...PHASE2[stage],
    ...PHASE3[sector],
  ];
}

/** Find the founder's answer to main question N by locating the AI message that asked it. */
function answerToQuestion(history: InterviewQuestionInput["history"], questionText: string): string | null {
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (m.role === "ai" && m.content.includes(questionText.slice(0, 30))) {
      const next = history.slice(i + 1).find((h) => h.role === "founder");
      return next?.content ?? null;
    }
  }
  return null;
}

const DONE_MESSAGE =
  "I have enough to build your profile. Let me put this together — you can review and edit everything before it goes live.";

export const getNextInterviewQuestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as InterviewQuestionInput)
  .handler(async ({ data }): Promise<InterviewQuestionResult> => {
    // Resolve the plan from answers so far. Stage/sector default until Q2/Q3
    // are answered; the plan is stable for Phase 1 regardless.
    const provisionalPlan = buildQuestionPlan(data.companyName, "early_revenue", "other");
    const stageAnswer = answerToQuestion(data.history, provisionalPlan[1]);
    const sectorAnswer = answerToQuestion(data.history, provisionalPlan[2]);
    const stage = stageAnswer ? classifyStage(stageAnswer) : "early_revenue";
    const sector = sectorAnswer ? classifySector(sectorAnswer) : "other";
    const plan = buildQuestionPlan(data.companyName, stage, sector);

    // All 10 main questions answered — done.
    if (data.questionIndex >= plan.length) {
      return { question: DONE_MESSAGE, isFollowUp: false, isDone: true, error: null };
    }

    const lastExchanges = data.history.slice(-2);
    const lastFounderAnswer = lastExchanges.find((h) => h.role === "founder");
    const lastAIMsg = lastExchanges.find((h) => h.role === "ai");

    // Was the last AI message a main question (vs. a follow-up)?
    const lastWasMainQuestion = !!lastAIMsg && plan.some((q) => lastAIMsg.content.includes(q.slice(0, 30)));

    // Hard cap: at most 2 follow-ups across the interview (10 main + 2 = 12 max)
    const followUpsSoFar = data.history.filter(
      (m) => m.role === "ai" && !plan.some((q) => m.content.includes(q.slice(0, 30))) && m.content !== DONE_MESSAGE,
    ).length;

    let ack = "";
    if (lastFounderAnswer && lastWasMainQuestion) {
      // One combined AI call: acknowledge the answer, decide on a follow-up.
      try {
        const systemPrompt = [
          "You are a sharp, warm venture investor conducting a founder interview to build their profile.",
          `The question you asked was: "${lastAIMsg!.content}"`,
          `The founder answered: "${lastFounderAnswer.content}"`,
          "Return ONLY JSON: { \"ack\": string, \"follow_up\": string | null }",
          "Rules:",
          "- ack: ONE short sentence acknowledging their answer naturally (max 15 words). Never argue, never say the answer is wrong, never grade it.",
          "- follow_up: only if the answer is vague or missing a concrete number/timeframe (e.g. \"we're growing fast\"), ask ONE specific clarifier like \"Can you give me a specific number or timeframe for that?\". Otherwise null.",
          "- Never re-ask the question. Never ask more than one thing.",
        ].join("\n");
        const raw = await callOpenAI(systemPrompt, "Respond with the JSON.", 150);
        const parsed = parseExtractionJSON(raw) as { ack?: string; follow_up?: string | null };
        ack = (parsed.ack ?? "").trim();
        const followUp = (parsed.follow_up ?? "").toString().trim();
        if (followUp && followUp.toLowerCase() !== "null" && followUpsSoFar < 2) {
          return { question: followUp, isFollowUp: true, isDone: false, error: null };
        }
      } catch {
        ack = "Got it.";
      }
    }

    const nextQ = plan[data.questionIndex];
    const question = ack ? `${ack} ${nextQ}` : nextQ;
    return { question, isFollowUp: false, isDone: false, error: null };
  });
