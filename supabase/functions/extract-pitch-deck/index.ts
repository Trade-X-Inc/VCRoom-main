import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const EXTRACTION_PROMPT = `You are extracting structured information from a startup pitch deck to populate a founder profile.

Extract the following fields from the pitch deck content.
Return ONLY a valid JSON object with these exact keys.
If a field cannot be found, use null.
Never make up information that isn't in the deck.

{
  "company_name": "string | null",
  "tagline": "one sentence description | null",
  "description": "2-3 sentence company description | null",
  "sector": "primary industry vertical | null",
  "stage": "Pre-seed | Seed | Series A | Series B | null",
  "country": "primary operating country | null",
  "funding_target": "number in USD, no symbols | null",
  "valuation": "number in USD, no symbols | null",
  "problem": "the problem being solved | null",
  "solution": "how it is solved | null",
  "why_us": "why this team can solve it | null",
  "why_now": "market timing / why now | null",
  "tam": "total addressable market description | null",
  "sam": "serviceable addressable market | null",
  "target_customer": "who the customer is | null",
  "revenue": "current revenue as number in USD | null",
  "revenue_model": "how the company makes money | null",
  "growth_rate": "growth rate as string e.g. +34% MoM | null",
  "customer_count": "number or description of customers | null",
  "traction": "key traction highlights 2-3 sentences | null",
  "pricing": "pricing model description | null",
  "burn_rate": "monthly burn as string | null",
  "runway_months": "runway in months as number | null",
  "founder_name": "founder full name | null",
  "cofounder_name": "co-founder full name | null",
  "competitors": "main competitors comma separated | null",
  "competitive_advantage": "key differentiator | null",
  "moat": "defensible moat description | null",
  "use_of_funds": "how funds will be used | null",
  "milestones": "18 month milestones | null",
  "current_investors": "existing investors if mentioned | null",
  "team_size": "number of employees | null",
  "founded_year": "year founded as number | null"
}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { fileBase64, fileName, mimeType } = await req.json();

    if (!fileBase64 || !fileName) {
      return new Response(
        JSON.stringify({ error: "fileBase64 and fileName required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");

    // Decode base64 to binary string for text extraction
    const decoded = atob(fileBase64);

    let sourceText: string;

    if (isPdf) {
      // Extract readable text from PDF binary using BT/ET stream markers
      const textMatches = decoded.match(/BT[\s\S]*?ET/g) ?? [];
      let btText = textMatches
        .join(" ")
        .replace(/\(([^)]+)\)/g, "$1 ")  // extract text in parens
        .replace(/[^\x20-\x7E\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Fallback: raw text strip if BT/ET extraction gives too little
      if (btText.length < 100) {
        btText = decoded
          .replace(/[^\x20-\x7E\n]/g, " ")
          .replace(/\s+/g, " ")
          .substring(0, 15000);
      }

      if (btText.length < 50) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "PDF appears to be a scanned image — no text found. Try PPTX or a text-based PDF.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      sourceText = btText.substring(0, 15000);
    } else {
      // PPTX / other: strip XML tags and binary noise
      sourceText = decoded
        .replace(/<[^>]+>/g, " ")
        .replace(/[^\x20-\x7E\n]/g, " ")
        .replace(/\s+/g, " ")
        .substring(0, 15000);
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: `Extract from this pitch deck text:\n\n${sourceText}` },
        ],
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });
    const aiData = await response.json();
    const rawJson = aiData.choices?.[0]?.message?.content ?? "{}";

    let extracted: Record<string, unknown> = {};
    try {
      extracted = JSON.parse(rawJson);
    } catch {
      extracted = {};
    }

    return new Response(
      JSON.stringify({ success: true, data: extracted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
