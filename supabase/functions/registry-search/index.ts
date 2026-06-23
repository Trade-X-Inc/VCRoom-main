import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPEN_AI_API_KEY") || "";

async function checkOpenCorporates(name: string, country: string) {
  try {
    const jurisdictionMap: Record<string, string> = {
      "UAE": "ae", "United Arab Emirates": "ae",
      "UK": "gb", "United Kingdom": "gb",
      "US": "us", "USA": "us", "United States": "us",
      "Saudi Arabia": "sa", "Bahrain": "bh",
      "Qatar": "qa", "Kuwait": "kw", "Oman": "om",
    };
    const jCode = jurisdictionMap[country] ?? "";
    const q = encodeURIComponent(name);
    const url = jCode
      ? `https://api.opencorporates.com/v0.4/companies/search?q=${q}&jurisdiction_code=${jCode}&per_page=5`
      : `https://api.opencorporates.com/v0.4/companies/search?q=${q}&per_page=5`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { found: false, status: "api_error", jurisdiction: "", registeredDate: "", url: "", confidence: 0 };

    const data = await res.json();
    const companies = data?.results?.companies ?? [];
    if (!companies.length) return { found: false, status: "not_found", jurisdiction: "", registeredDate: "", url: "", confidence: 0 };

    const clean = name.toLowerCase().trim();
    let best = companies[0]?.company;
    let confidence = 60;
    for (const item of companies) {
      const n = (item.company.name ?? "").toLowerCase();
      if (n === clean) { best = item.company; confidence = 90; break; }
      if (n.includes(clean) || clean.includes(n)) { best = item.company; confidence = 75; }
    }
    const active = best.current_status?.toLowerCase().match(/active|live|registered/);
    return {
      found: true,
      status: best.current_status ?? "unknown",
      jurisdiction: best.jurisdiction_code ?? "",
      registeredDate: best.incorporation_date ?? "",
      url: best.opencorporates_url ?? "",
      confidence: active ? confidence : Math.round(confidence * 0.7),
    };
  } catch {
    return { found: false, status: "error", jurisdiction: "", registeredDate: "", url: "", confidence: 0 };
  }
}

async function checkCompaniesHouse(name: string) {
  try {
    const res = await fetch(
      `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(name)}&items_per_page=5`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return { found: false, status: "api_error", number: "", url: "", confidence: 0 };

    const data = await res.json();
    const items = data?.items ?? [];
    if (!items.length) return { found: false, status: "not_found", number: "", url: "", confidence: 0 };

    const clean = name.toLowerCase().trim();
    let best = items[0];
    let confidence = 55;
    for (const item of items) {
      const n = (item.title ?? "").toLowerCase();
      if (n === clean) { best = item; confidence = 88; break; }
      if (n.includes(clean) || clean.includes(n)) { best = item; confidence = 70; }
    }
    return {
      found: true,
      status: best.company_status ?? "unknown",
      number: best.company_number ?? "",
      url: `https://find-and-update.company-information.service.gov.uk/company/${best.company_number}`,
      confidence: best.company_status === "active" ? confidence : Math.round(confidence * 0.6),
    };
  } catch {
    return { found: false, status: "error", number: "", url: "", confidence: 0 };
  }
}

// DIFC check — web-search-assisted, NOT a direct registry API.
// Confidence capped at 45 so DIFC alone can never flip verified=true (threshold 60).
async function checkDIFC(name: string): Promise<{
  found: boolean;
  status: string;
  confidence: number;        // score for overall calc (max 45)
  confidenceLabel: string | null;  // "high" | "medium" | "low" | null
  sourceUrl: string | null;
  method: "ai_web_search";
}> {
  let pageText = "";
  let sourceUrl: string | null = null;

  // Try fetching the DIFC public register page with search param
  for (const url of [
    `https://www.difc.ae/business/public-register/?search=${encodeURIComponent(name)}`,
    `https://www.difc.ae/business/public-register/`,
  ]) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Hockystick-Verification-Bot/1.0)", Accept: "text/html" },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const html = await res.text();
        pageText = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 4000);
        sourceUrl = url;
        break;
      }
    } catch { /* try next */ }
  }

  // DuckDuckGo web search as a secondary signal
  let searchSnippet = "";
  try {
    const ddgRes = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`"${name}" site:difc.ae`)}`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; Hockystick-Verification-Bot/1.0)", Accept: "text/html" }, signal: AbortSignal.timeout(8000) }
    );
    if (ddgRes.ok) {
      const html = await ddgRes.text();
      searchSnippet = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 2000);
      if (!sourceUrl) sourceUrl = "https://www.difc.ae/business/public-register/";
    }
  } catch { /* DuckDuckGo unavailable */ }

  if (!pageText && !searchSnippet) {
    return { found: false, status: "no_data_returned", confidence: 0, confidenceLabel: null, sourceUrl, method: "ai_web_search" };
  }

  if (!OPENAI_API_KEY) {
    return { found: false, status: "ai_unavailable", confidence: 0, confidenceLabel: null, sourceUrl, method: "ai_web_search" };
  }

  const context = [
    pageText ? `DIFC register page:\n${pageText}` : "",
    searchSnippet ? `Web search for "${name}" site:difc.ae:\n${searchSnippet}` : "",
  ].filter(Boolean).join("\n\n");

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 100,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "Does the company name appear in DIFC (Dubai International Financial Centre) entity register content? JSON only: { \"found\": boolean, \"status\": \"active\"|\"dissolved\"|\"unclear\"|\"no_match_found\", \"confidence\": \"high\"|\"medium\"|\"low\" }. Use 'high' only for exact name match in a direct register listing.",
          },
          { role: "user", content: `Company: "${name}"\n\n${context}` },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!aiRes.ok) return { found: false, status: "ai_error", confidence: 0, confidenceLabel: null, sourceUrl, method: "ai_web_search" };

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    const found = parsed.found === true;
    const confidenceLabel: string = parsed.confidence ?? "low";
    const scoreMap: Record<string, number> = { high: 45, medium: 30, low: 15 };
    const score = found ? (scoreMap[confidenceLabel] ?? 15) : 0;

    return { found, status: parsed.status ?? (found ? "active" : "no_match_found"), confidence: score, confidenceLabel, sourceUrl, method: "ai_web_search" };
  } catch {
    return { found: false, status: "ai_error", confidence: 0, confidenceLabel: null, sourceUrl, method: "ai_web_search" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { company_name, country = "" } = await req.json();
    if (!company_name || company_name.trim().length < 2) {
      return new Response(JSON.stringify({ error: "company_name required (min 2 chars)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const name = company_name.trim();
    const [oc, ch, difcResult] = await Promise.all([
      checkOpenCorporates(name, country),
      checkCompaniesHouse(name),
      checkDIFC(name),
    ]);

    const maxConf = Math.max(oc.confidence, ch.confidence, difcResult.confidence);
    const verified = maxConf >= 60;

    const foundIn = [
      oc.found && `OpenCorporates (${oc.jurisdiction?.toUpperCase() || "global"})`,
      ch.found && "UK Companies House",
      difcResult.found && "DIFC (best-effort web search)",
    ].filter(Boolean);

    const summary = foundIn.length > 0
      ? `Registration signal found via ${foundIn.join(", ")}. Confidence: ${maxConf}%. Source-cited, not manually confirmed.`
      : "No company registration found in checked registries. This does not confirm non-existence — registries may be incomplete or use different name formats.";

    // DIFC result shape passed to UI — includes method/confidence label/sourceUrl
    const difcUiResult = {
      found: difcResult.found,
      status: difcResult.status,
      confidence: difcResult.confidence,
      confidenceLabel: difcResult.confidenceLabel,
      sourceUrl: difcResult.sourceUrl,
      method: difcResult.method,
    };

    return new Response(
      JSON.stringify({
        result: { company: name, opencorporates: oc, companies_house: ch, difc: difcUiResult, verified, confidence: maxConf, summary },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
