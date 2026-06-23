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

// ── Interview next question ────────────────────────────────────────────────────
type InterviewQuestionInput = {
  userId: string;
  history: Array<{ role: "ai" | "founder"; content: string }>;
  questionIndex: number;
};

type InterviewQuestionResult = {
  question: string;
  isFollowUp: boolean;
  isDone: boolean;
  error: string | null;
};

const INTERVIEW_QUESTIONS = [
  "What's your company called, and what does it do in one sentence?",
  "What stage are you at — pre-revenue, pre-seed, seed, or Series A?",
  "What problem are you solving, and for who?",
  "How do you make money? (Or plan to)",
  "What's your traction so far? (users, revenue, pilots, LOIs — whatever you have)",
  "Who's on your team? Names and what they do.",
  "How much are you raising, and what's it for?",
  "What's your biggest competitive advantage?",
];

export const getNextInterviewQuestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as InterviewQuestionInput)
  .handler(async ({ data }): Promise<InterviewQuestionResult> => {
    // All 8 areas answered — done
    if (data.questionIndex >= INTERVIEW_QUESTIONS.length) {
      return { question: "", isFollowUp: false, isDone: true, error: null };
    }

    // If there was a last founder answer, check if a follow-up is warranted
    const lastExchanges = data.history.slice(-2);
    const lastFounderAnswer = lastExchanges.find((h) => h.role === "founder");
    const lastAIMsg = lastExchanges.find((h) => h.role === "ai");

    // If the last AI message was already a follow-up (not a main question), move on
    const lastWasFollowUp = lastAIMsg && !INTERVIEW_QUESTIONS.some((q) => lastAIMsg.content.startsWith(q.slice(0, 20)));

    if (lastFounderAnswer && !lastWasFollowUp) {
      // Ask AI: should we follow up or move on?
      try {
        const systemPrompt = `You are conducting a structured founder interview to build a startup profile.
The current main question was: "${INTERVIEW_QUESTIONS[data.questionIndex - 1]}"
The founder answered: "${lastFounderAnswer.content}"

Decide: is ONE brief clarifying follow-up question warranted because the answer was vague, ambiguous, or incomplete for building a startup profile?

Rules:
- If the answer is clear enough, respond with exactly: MOVE_ON
- If a follow-up is needed, write ONLY the follow-up question (one sentence, conversational, not a form field).
- Never ask more than one follow-up per main question.
- Do not re-ask the main question.`;

        const decision = await callOpenAI(systemPrompt, "Should I follow up?", 100);
        const trimmed = decision.trim();
        if (trimmed !== "MOVE_ON" && trimmed.length > 5) {
          return { question: trimmed, isFollowUp: true, isDone: false, error: null };
        }
      } catch {
        // Fall through to next main question on error
      }
    }

    const nextQ = INTERVIEW_QUESTIONS[data.questionIndex];
    return { question: nextQ, isFollowUp: false, isDone: false, error: null };
  });
