import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";

type SummaryInput = {
  documentPath: string;
  documentName: string;
  dealRoomId: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  openAIKey?: string;
};

const FALLBACK = "Document uploaded. AI summary not available for this file type. Please review manually.";

export const generateDocumentSummary = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): SummaryInput => data as SummaryInput)
  .handler(async ({ data }: { data: SummaryInput }): Promise<{ summary: string | null; error?: string }> => {
    const supabaseUrl = data.supabaseUrl || getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const supabaseKey = data.supabaseKey || getEnvVar("SUPABASE_SERVICE_ROLE_KEY") || getEnvVar("VITE_SUPABASE_SERVICE_ROLE_KEY");
    const openAIKey = data.openAIKey || getEnvVar("OPENAI_API_KEY") || (import.meta.env as any).VITE_OPENAI_API_KEY || "";
    console.log('Supabase URL:', supabaseUrl?.slice(0, 30));

    if (!openAIKey) {
      return { summary: null, error: 'OpenAI API key not configured. Check Cloudflare environment variables.' };
    }
    if (!supabaseUrl || !supabaseKey) {
      return { summary: null, error: 'Supabase configuration missing.' };
    }

    const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const { data: blob, error: dlError } = await client.storage
      .from("documents")
      .download(data.documentPath);

    console.log('Download error:', dlError?.message ?? 'none');
    console.log('Blob size:', (blob as any)?.size);

    if (dlError || !blob) {
      return { summary: null, error: `File download failed: ${dlError?.message ?? 'file not found'}` };
    }

    const fileName = data.documentName || data.documentPath?.split("/").pop() || "";
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    let textContent = "";

    if (["pptx", "ppt"].includes(ext)) {
      try {
        const arrayBuffer = await (blob as Blob).arrayBuffer();
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const rawText = decoder.decode(new Uint8Array(arrayBuffer));
        const atMatches = rawText.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
        const tMatches = rawText.match(/<t[^>]*>([^<]+)<\/t>/g) ?? [];
        const allMatches = atMatches.length >= tMatches.length ? atMatches : tMatches;
        textContent = allMatches
          .map((m) => m.replace(/<[^>]+>/g, "").trim())
          .filter((t) => t.length > 1)
          .join(" ")
          .replace(/\s+/g, " ")
          .slice(0, 4000)
          .trim();
      } catch {
        textContent = "";
      }
    } else if (["docx", "doc"].includes(ext)) {
      try {
        const arrayBuffer = await (blob as Blob).arrayBuffer();
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const rawText = decoder.decode(new Uint8Array(arrayBuffer));
        const wtMatches = rawText.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) ?? [];
        textContent = wtMatches
          .map((m) => m.replace(/<[^>]+>/g, "").trim())
          .filter((t) => t.length > 0)
          .join(" ")
          .replace(/\s+/g, " ")
          .slice(0, 4000)
          .trim();
      } catch {
        textContent = "";
      }
    } else {
      try {
        const raw = await (blob as Blob).text();
        textContent = raw
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
          .replace(/\s+/g, " ")
          .slice(0, 4000)
          .trim();
      } catch {
        textContent = "";
      }
    }

    console.log('Text extracted length:', textContent?.length);

    if (!textContent || textContent.length < 20) {
      textContent = `Document: ${fileName} (${ext.toUpperCase()}). File could not be parsed for text content. Please describe what a ${ext.toUpperCase()} document in a startup fundraising context typically contains.`;
    }

    const prompt = `Analyze this document and provide a structured summary with:
1. What this document is
2. Key findings and data points
3. What's strong/notable
4. What's missing or unclear
5. Relevance for investment due diligence

Document name: ${fileName}
Document content:
${textContent.slice(0, 3000)}`;

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
          { role: "system", content: "You are a senior VC analyst. Analyze startup documents and provide structured, specific summaries. Focus on investment-relevant details: metrics, market size, team, traction, financials. Be direct and concise." },
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
