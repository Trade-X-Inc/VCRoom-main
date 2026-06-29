import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "@/lib/env";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatInput {
  message: string;
  history: ChatMessage[];
  language?: string;
}

interface ChatResult {
  reply: string;
  error: string | null;
}

const SYSTEM_PROMPT = `You are a concise, direct AI assistant for Hockystick — a verified fundraising platform connecting MENA founders with investors.

CRITICAL LANGUAGE RULE: You MUST reply in the EXACT same language the user writes in. If they write in English → reply in English. If they write in Arabic → reply in Arabic. If they write in French → reply in French. NEVER switch languages. This is non-negotiable.

WHAT HOCKYSTICK DOES:
Hockystick replaces the pitch deck with a verified founder profile. Investors browse structured, AI-reviewed profiles with staged document access — from public overview to full due diligence inside encrypted deal rooms.

FOR FOUNDERS:
- Build a structured profile (replaces pitch deck)
- Complete the Document Intelligence Centre (16 templates: financial model, cap table, market sizing, competitive landscape, traction, team bios, ESOP, and more)
- AI reviews every document with VC-grade scoring
- Run an Investor Simulation to see exactly how a VC reads your profile before you go live
- Investors who match your sector/stage/geography receive automatic thesis match alerts
- Staged access: public profile → detail pack → deal room

FOR INVESTORS:
- Browse verified founder profiles in the directory
- Receive automated thesis match alerts daily
- Connect → request detail pack → open deal room
- Each deal room includes AI-generated deal brief with key metrics, strengths, red flags, and DD questions
- Hockystick Checked badge confirms digital presence
- Hockystick Verified (Q3 2026): manual identity review

VERIFICATION SYSTEM:
- Hockystick Checked: website, LinkedIn, email domain verified
- Hockystick Verified: manual review (Q3 2026)
- Both founders and investors are verified — unique in market

KEY FACTS:
- Free during beta
- Based in DIFC FinTech Hive, Dubai
- Built for GCC and MENA, open globally
- No warm introductions needed
- Pricing: Free / $49 / $149 / $499 / Enterprise custom

TONE — follow strictly:
- Direct, no filler words
- No exclamation marks
- No buzzwords (innovative, seamless, leverage, cutting-edge)
- Under 3 sentences per answer unless detail is needed
- Never say "Great question!"
- No bullet points with stars (**)
- Short sentences under 20 words

If asked about pricing: Free plan + $49/$149/$499/Enterprise. All free during beta.
If asked how to sign up: hockystick.app, click Get started, choose founder or investor.
If asked about security: NDA-gated deal rooms, encrypted vault, documents never leave the platform.
If asked about Web3: Coming in 2027, join waitlist at hockystick.app/contact?interest=web3.`;

export const askOnboardingAI = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): ChatInput => data as ChatInput)
  .handler(async ({ data }): Promise<ChatResult> => {
    // CRITICAL: Read key INSIDE handler, never at module level
    const cfEnv = (globalThis as any).__cf_env || {};
    const apiKey =
      cfEnv.OPENAI_API_KEY ||
      cfEnv.OPEN_AI_API_KEY ||
      cfEnv["OPEN AI API KEY"] ||
      getEnvVar("OPENAI_API_KEY") ||
      "";
    console.log("[OnboardingChat] Key exists:", !!apiKey, "prefix:", apiKey ? apiKey.slice(0, 8) : "MISSING");

    if (!apiKey) {
      console.error("[OnboardingChat] OPENAI_API_KEY not found in cfEnv or getEnvVar");
      return {
        reply: "I'm currently offline. Please sign up at hockystick.app/sign-up to explore the platform, or join our waitlist at hockystick.app/waitlist.",
        error: "no_key",
      };
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...data.history.slice(-6),
      { role: "user", content: data.message },
    ];

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("[OnboardingChat] OpenAI error:", response.status, err);
        return {
          reply: "I'm having trouble connecting right now. Try signing up directly at hockystick.app/sign-up — it takes 30 seconds.",
          error: "api_error",
        };
      }

      const result = await response.json() as { choices: Array<{ message: { content: string } }> };
      const content = result.choices?.[0]?.message?.content || "";

      if (!content) {
        console.error("[OnboardingChat] Empty response from OpenAI");
        return { reply: "I didn't catch that — could you try again?", error: "empty_response" };
      }

      // Save conversation to Supabase (fire and forget)
      try {
        const sbUrl = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || "";
        const sbKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";
        if (sbUrl && sbKey) {
          fetch(`${sbUrl}/rest/v1/onboarding_conversations`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: sbKey,
              Authorization: `Bearer ${sbKey}`,
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              message: data.message,
              response: content,
              language: data.language || "en",
            }),
          }).catch(() => {});
        }
      } catch {}

      return { reply: content, error: null };
    } catch (err) {
      console.error("[OnboardingChat] Fetch error:", err);
      return { reply: "Connection error. Please try again.", error: "fetch_error" };
    }
  });
