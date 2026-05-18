import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type SummaryInput = {
  documentPath: string;
  documentName: string;
  dealRoomId: string;
  openAIKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  userAccessToken?: string;
};

const FALLBACK = "Document uploaded. AI summary not available for this file type. Please review manually.";

export const generateDocumentSummary = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): SummaryInput => data as SummaryInput)
  .handler(async ({ data }: { data: SummaryInput }): Promise<{ summary: string }> => {
    console.log('Summary fn called:', { documentPath: data.documentPath, documentName: data.documentName });

    const supabaseUrl =
      data.supabaseUrl ||
      process.env.VITE_SUPABASE_URL ||
      (globalThis as any).VITE_SUPABASE_URL ||
      "";
    const supabaseKey =
      data.supabaseAnonKey ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      (globalThis as any).VITE_SUPABASE_ANON_KEY ||
      "";
    const openAIKey =
      data.openAIKey ||
      (globalThis as any).VITE_OPENAI_API_KEY ||
      (globalThis as any).OPENAI_API_KEY ||
      process.env.VITE_OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      '';

    console.log('OpenAI key present:', !!openAIKey);
    console.log('Supabase URL:', supabaseUrl?.slice(0, 20));

    if (!supabaseUrl || !supabaseKey || !openAIKey) return { summary: FALLBACK };

    const client = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${data.userAccessToken ?? ""}` } },
    });

    const { data: blob, error } = await client.storage
      .from("documents")
      .download(data.documentPath);

    console.log('File download result:', { error: error?.message, dataSize: (blob as any)?.size });

    if (error || !blob) return { summary: FALLBACK };

    let textContent = "";
    try {
      const raw = await (blob as Blob).text();
      textContent = raw
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 3000)
        .trim();
    } catch {
      return { summary: FALLBACK };
    }

    console.log('Text extracted length:', textContent?.length);

    if (!textContent || textContent.length < 20) return { summary: FALLBACK };

    const prompt = `Document: ${data.documentName}
Content preview: ${textContent}

Generate a 3-paragraph summary:
Para 1: What this document is and its purpose
Para 2: Key information or findings
Para 3: Relevance for investment due diligence

Keep each paragraph under 60 words. Be specific, not generic.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        temperature: 0.3,
        messages: [
          { role: "system", content: "You are a VC analyst assistant. Generate a concise document summary." },
          { role: "user", content: prompt },
        ],
      }),
    });

    console.log('OpenAI response status:', resp.status);
    if (!resp.ok) return { summary: FALLBACK };
    const json = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
    return { summary: json.choices[0]?.message?.content ?? FALLBACK };
  });
