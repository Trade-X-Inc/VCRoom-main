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

    try {
      const raw = await (blob as Blob).text();

      if (["pptx", "docx", "xlsx", "ppt", "doc", "xls"].includes(ext)) {
        // Office files are ZIP-based binary — extract readable strings from embedded XML
        const pptxMatches = raw.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
        const docxMatches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) ?? [];
        const xmlMatches = pptxMatches.length >= docxMatches.length ? pptxMatches : docxMatches;
        const extractedText = xmlMatches
          .map((m) => m.replace(/<[^>]+>/g, ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (extractedText.length > 50) {
          textContent = extractedText.slice(0, 3000);
        } else {
          // Fallback: pull readable ASCII strings from binary
          textContent = raw
            .replace(/[^\x20-\x7E\n\r\t]/g, " ")
            .replace(/\s+/g, " ")
            .split(" ")
            .filter((w) => w.length > 3)
            .join(" ")
            .slice(0, 3000)
            .trim();
        }
      } else {
        // PDF and plain-text files
        textContent = raw
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
          .replace(/\s+/g, " ")
          .slice(0, 3000)
          .trim();
      }
    } catch {
      return { summary: null, error: "Failed to extract text from file." };
    }

    console.log('Text extracted length:', textContent?.length);

    if (!textContent || textContent.length < 10) {
      // Last resort: generate summary from filename alone
      textContent = `Document: ${fileName}. File type: ${ext.toUpperCase()}. Please provide a brief summary noting this is a ${ext.toUpperCase()} document that could not be fully parsed, and describe what this type of document typically contains in a startup fundraising context.`;
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
          { role: "system", content: "You are a VC analyst assistant. Generate a concise document summary. If the provided text appears to be partially extracted from a binary file (PPTX/DOCX), do your best to extract meaningful information and note any limitations." },
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
