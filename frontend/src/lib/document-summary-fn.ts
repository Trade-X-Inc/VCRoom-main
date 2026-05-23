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

    const fileName = data.documentName ||
      data.documentPath?.split("/").pop()?.replace(/^\d{13}-/, "") || "";
    const pathFileName = data.documentPath?.split("/").pop() || "";
    const ext = (fileName.split(".").pop() || pathFileName.split(".").pop() || "").toLowerCase();
    console.log("[summary-fn] fileName:", fileName, "ext:", ext, "path:", data.documentPath?.slice(-50));
    let textContent = "";

    if (["pptx", "ppt"].includes(ext)) {
      try {
        const arrayBuffer = await (blob as Blob).arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const fullText = decoder.decode(bytes);

        const patterns = [
          /<a:t[^>]*?>([^<]{2,})<\/a:t>/g,
          /<a:t>([^<]{2,})<\/a:t>/g,
          /<w:t[^>]*?>([^<]{2,})<\/w:t>/g,
        ];

        let bestResult = "";
        for (const pattern of patterns) {
          const matches = [...fullText.matchAll(pattern)];
          if (matches.length > 5) {
            const extracted = matches
              .map((m) => m[1].trim())
              .filter((t) => t.length > 1 && /[a-zA-Z]/.test(t))
              .join(" • ")
              .slice(0, 3000);
            if (extracted.length > bestResult.length) bestResult = extracted;
          }
        }

        textContent = bestResult;
        console.log(`[PPTX extract] fileName: ${fileName}, chars: ${textContent.length}, preview: ${textContent.slice(0, 100)}`);
      } catch (err) {
        console.log(`[PPTX extract] failed: ${err}`);
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

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 250,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "You are a VC analyst. Write a brief document summary in 3-5 bullet points max. Be specific — use actual numbers, names, and facts from the content. If the content appears garbled or unreadable, say exactly: 'Could not extract readable content from this file. Please preview the document directly.' Never invent details.",
          },
          {
            role: "user",
            content: `Document: ${fileName} (${ext?.toUpperCase()})\n\nContent extracted:\n${textContent.slice(0, 3000)}\n\nWrite 3-5 bullet points summarizing the key facts. If content is garbled binary data rather than readable text, say you cannot summarize it.`,
          },
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
