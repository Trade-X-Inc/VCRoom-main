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
  .handler(async ({ data }: { data: SummaryInput }): Promise<{ summary: string | null; error?: string }> => {
    console.log('=== SUMMARY FN START ===');
    console.log('Document path:', data.documentPath);
    console.log('Document name:', data.documentName);
    console.log('=== ENV CHECK ===');
    console.log('Keys available on globalThis:',
      Object.keys(globalThis as any).filter((k) => k.includes('OPENAI') || k.includes('API'))
    );
    console.log('OPENAI_API_KEY exists:', !!(globalThis as any).OPENAI_API_KEY);
    console.log('OPENAI_API_KEY length:', ((globalThis as any).OPENAI_API_KEY ?? '').length);

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
      (globalThis as any).OPENAI_API_KEY ||
      (globalThis as any)['OPENAI_API_KEY'] ||
      (globalThis as any).VITE_OPENAI_API_KEY ||
      data.openAIKey ||
      process.env.OPENAI_API_KEY ||
      process.env.VITE_OPENAI_API_KEY ||
      '';

    console.log('OpenAI key present:', !!openAIKey);
    console.log('OpenAI key length:', openAIKey?.length);
    console.log('Supabase URL:', supabaseUrl?.slice(0, 30));

    if (!openAIKey) {
      return { summary: null, error: 'OpenAI API key not configured. Check Cloudflare environment variables.' };
    }
    if (!supabaseUrl || !supabaseKey) {
      return { summary: null, error: 'Supabase configuration missing.' };
    }

    const client = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${data.userAccessToken ?? ""}` } },
    });

    const { data: blob, error: dlError } = await client.storage
      .from("documents")
      .download(data.documentPath);

    console.log('Download error:', dlError?.message ?? 'none');
    console.log('Blob size:', (blob as any)?.size);

    if (dlError || !blob) {
      return { summary: null, error: `File download failed: ${dlError?.message ?? 'file not found'}` };
    }

    let textContent = "";
    try {
      const raw = await (blob as Blob).text();
      textContent = raw
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 3000)
        .trim();
    } catch {
      return { summary: null, error: 'Failed to extract text from file.' };
    }

    console.log('Text extracted length:', textContent?.length);

    if (!textContent || textContent.length < 20) {
      return { summary: null, error: 'File has no readable text content (binary or empty).' };
    }

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
    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({})) as any;
      return { summary: null, error: `OpenAI error ${resp.status}: ${errBody?.error?.message ?? 'unknown'}` };
    }
    const json = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
    const content = json.choices[0]?.message?.content;
    if (!content) return { summary: null, error: 'OpenAI returned empty response.' };
    return { summary: content };
  });
