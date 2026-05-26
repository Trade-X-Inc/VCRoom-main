import { createServerFn } from "@tanstack/react-start";

type ChatInput = {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
};

type ChatResult = {
  reply: string;
  error: string | null;
};

const SYSTEM_PROMPT =
  "You are the Hockeystick onboarding assistant on the landing page. Hockeystick is a private deal flow platform for founders raising capital and investors managing deal flow. Features include: secure deal rooms, document vault with AI summaries, AI due diligence, investor pipeline management, team chat, and investment memos. Keep answers to 2-3 sentences max. Be conversational and helpful. End every answer with a relevant next step. Never make up features that don't exist.";

export const askOnboardingAI = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): ChatInput => data as ChatInput)
  .handler(async ({ data }): Promise<ChatResult> => {
    const openAIKey =
      (typeof process !== "undefined" && process.env.OPENAI_API_KEY) ||
      (import.meta.env as any).OPENAI_API_KEY ||
      (import.meta.env as any).VITE_OPENAI_API_KEY ||
      "";

    if (!openAIKey) {
      return { reply: "AI is temporarily unavailable. Sign up to explore the platform!", error: "no_key" };
    }

    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 150,
          temperature: 0.7,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...data.history.slice(-6),
            { role: "user", content: data.message },
          ],
        }),
      });

      if (!resp.ok) {
        return { reply: "Something went wrong. Try again!", error: "api_error" };
      }

      const json = (await resp.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      return { reply: json.choices[0]?.message?.content ?? "", error: null };
    } catch {
      return { reply: "Connection error. Please try again.", error: "fetch_error" };
    }
  });
