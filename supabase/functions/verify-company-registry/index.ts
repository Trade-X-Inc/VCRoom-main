import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPEN_AI_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── OpenCorporates ──────────────────────────────────────────────────────────

async function checkOpenCorporates(companyName: string, country: string) {
  try {
    const jurisdictionMap: Record<string, string> = {
      "UAE": "ae", "United Arab Emirates": "ae",
      "UK": "gb", "United Kingdom": "gb",
      "US": "us", "USA": "us", "United States": "us",
      "Saudi Arabia": "sa", "Bahrain": "bh",
      "Qatar": "qa", "Kuwait": "kw", "Oman": "om",
      "Singapore": "sg", "Cayman Islands": "ky", "BVI": "vg", "Delaware": "us_de",
    };
    const jCode = jurisdictionMap[country] ?? "";
    const q = encodeURIComponent(companyName);
    const url = jCode
      ? `https://api.opencorporates.com/v0.4/companies/search?q=${q}&jurisdiction_code=${jCode}&per_page=5`
      : `https://api.opencorporates.com/v0.4/companies/search?q=${q}&per_page=5`;

    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { found: false, status: "api_error", jurisdiction: "", registeredDate: "", url: "", confidence: 0 };

    const data = await res.json();
    const companies = data?.results?.companies ?? [];
    if (!companies.length) return { found: false, status: "not_found", jurisdiction: "", registeredDate: "", url: "", confidence: 0 };

    const clean = companyName.toLowerCase().trim();
    let best = companies[0]?.company;
    let confidence = 60;
    for (const item of companies) {
      const n = (item.company.name ?? "").toLowerCase();
      if (n === clean) { best = item.company; confidence = 90; break; }
      if (n.includes(clean) || clean.includes(n)) { best = item.company; confidence = 75; }
    }
    const isActive = best.current_status?.toLowerCase().match(/active|live|registered/);
    return {
      found: true,
      status: best.current_status ?? "unknown",
      jurisdiction: best.jurisdiction_code ?? "",
      registeredDate: best.incorporation_date ?? "",
      url: best.opencorporates_url ?? "",
      confidence: isActive ? confidence : Math.round(confidence * 0.7),
    };
  } catch {
    return { found: false, status: "error", jurisdiction: "", registeredDate: "", url: "", confidence: 0 };
  }
}

// ─── UK Companies House ───────────────────────────────────────────────────────

async function checkCompaniesHouse(companyName: string) {
  try {
    const res = await fetch(
      `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(companyName)}&items_per_page=5`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return { found: false, status: "api_error", number: "", url: "", confidence: 0 };

    const data = await res.json();
    const items = data?.items ?? [];
    if (!items.length) return { found: false, status: "not_found", number: "", url: "", confidence: 0 };

    const clean = companyName.toLowerCase().trim();
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

// ─── DIFC (UAE) — AI-assisted web search, NOT a direct API ───────────────────
//
// There is no free queryable DIFC entity register API. The register exists only
// as a searchable web page at difc.ae/business/public-register.
// This function attempts a web fetch of the DIFC search page and uses AI to
// read the result. It is LOWER CONFIDENCE than the structured checks above.
// difc_check_method is ALWAYS 'ai_web_search' — never 'api'.

async function checkDIFC(companyName: string): Promise<{
  difc_found: boolean;
  difc_status: string;
  difc_check_method: string;
  difc_confidence: string | null;
  difc_source_url: string | null;
  difc_checked_at: string;
  // synthetic confidence score for tier scoring (capped lower than structured checks)
  score_confidence: number;
}> {
  const now = new Date().toISOString();
  const base = {
    difc_check_method: "ai_web_search",
    difc_checked_at: now,
  };

  // Step 1: Try fetching the DIFC public register search page
  let pageText = "";
  let sourceUrl: string | null = null;

  // Try multiple DIFC search endpoints — their URL structure may vary
  const searchUrls = [
    `https://www.difc.ae/business/public-register/?search=${encodeURIComponent(companyName)}`,
    `https://www.difc.ae/business/public-register/`,
  ];

  for (const url of searchUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Hockystick-Verification-Bot/1.0)",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const html = await res.text();
        // Strip scripts/styles, keep text
        pageText = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .slice(0, 4000);
        sourceUrl = url;
        break;
      }
    } catch {
      // Try next
    }
  }

  // Step 2: Also try Google search results via a DuckDuckGo-style scrape for
  // "{company_name} site:difc.ae" — this gives a second signal if the page
  // fetch failed or returned a blank SPA
  let searchSnippet = "";
  try {
    const q = encodeURIComponent(`"${companyName}" site:difc.ae`);
    const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${q}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Hockystick-Verification-Bot/1.0)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (ddgRes.ok) {
      const html = await ddgRes.text();
      searchSnippet = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 2000);
      if (!sourceUrl) sourceUrl = "https://www.difc.ae/business/public-register/";
    }
  } catch {
    // DuckDuckGo fetch failed — continue with what we have
  }

  // If we got nothing at all, mark as attempted-but-no-data
  if (!pageText && !searchSnippet) {
    return {
      ...base,
      difc_found: false,
      difc_status: "no_data_returned",
      difc_confidence: null,
      difc_source_url: sourceUrl,
      score_confidence: 0,
    };
  }

  // Step 3: Use AI to read what we fetched and determine if the company appears
  if (!OPENAI_API_KEY) {
    // No AI key — we attempted but can't analyse
    return {
      ...base,
      difc_found: false,
      difc_status: "ai_unavailable",
      difc_confidence: null,
      difc_source_url: sourceUrl,
      score_confidence: 0,
    };
  }

  const context = [
    pageText ? `DIFC register page content:\n${pageText}` : "",
    searchSnippet ? `Web search snippets for "${companyName} site:difc.ae":\n${searchSnippet}` : "",
  ].filter(Boolean).join("\n\n");

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 150,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: [
              "You are checking whether a company name appears in DIFC (Dubai International Financial Centre) entity register content.",
              "The DIFC register is a UAE financial free zone — not all UAE companies are registered there.",
              "Respond with JSON only, no markdown: { \"found\": boolean, \"status\": \"active\" | \"dissolved\" | \"unclear\" | \"no_match_found\", \"confidence\": \"high\" | \"medium\" | \"low\", \"reasoning\": \"one sentence\" }",
              "Use 'high' confidence only if the company name matches exactly and the page clearly shows a DIFC entry.",
              "Use 'medium' if there is a partial name match or ambiguous reference.",
              "Use 'low' if inferring from search snippets without seeing a direct register listing.",
              "If the company does not appear at all, use found: false, status: no_match_found.",
            ].join(" "),
          },
          {
            role: "user",
            content: `Company to check: "${companyName}"\n\n${context}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!aiRes.ok) {
      return { ...base, difc_found: false, difc_status: "ai_error", difc_confidence: null, difc_source_url: sourceUrl, score_confidence: 0 };
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    const found = parsed.found === true;
    const status = parsed.status ?? (found ? "active" : "no_match_found");
    const confidence: string = parsed.confidence ?? "low";

    // Score mapping: DIFC AI search is capped lower than structured API checks.
    // OpenCorporates/Companies House can reach 60-90. DIFC AI tops at 45.
    // This means DIFC alone CANNOT flip registry_confirmed (threshold: 60).
    const scoreMap: Record<string, number> = { high: 45, medium: 30, low: 15 };
    const score_confidence = found ? (scoreMap[confidence] ?? 15) : 0;

    return {
      ...base,
      difc_found: found,
      difc_status: status,
      difc_confidence: confidence,
      difc_source_url: sourceUrl,
      score_confidence,
    };
  } catch {
    return { ...base, difc_found: false, difc_status: "ai_error", difc_confidence: null, difc_source_url: sourceUrl, score_confidence: 0 };
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function calculateVerification(
  oc: Awaited<ReturnType<typeof checkOpenCorporates>>,
  ch: Awaited<ReturnType<typeof checkCompaniesHouse>>,
  difcScore: number,
  difcFound: boolean,
  difcJurisdiction: string
): { verified: boolean; confidence: number; summary: string; jurisdiction: string } {
  let maxConf = 0;
  let bestJurisdiction = "";
  const foundIn: string[] = [];

  if (oc.found) { maxConf = Math.max(maxConf, oc.confidence); bestJurisdiction = oc.jurisdiction; foundIn.push(`OpenCorporates (${oc.jurisdiction.toUpperCase()})`); }
  if (ch.found) { maxConf = Math.max(maxConf, ch.confidence); if (!bestJurisdiction) bestJurisdiction = "gb"; foundIn.push("UK Companies House"); }
  if (difcFound) {
    // DIFC AI web search contributes score but at reduced weight
    maxConf = Math.max(maxConf, difcScore);
    if (!bestJurisdiction) bestJurisdiction = difcJurisdiction;
    foundIn.push("DIFC (best-effort web search)");
  }

  const verified = maxConf >= 60;
  const summary = foundIn.length > 0
    ? `Registration signal found via ${foundIn.join(", ")}. Confidence: ${maxConf}%. Source-cited, not manually confirmed.`
    : "No company registration found in checked registries. This does not confirm non-existence — registries may be incomplete or use different name formats.";

  return { verified, confidence: maxConf, summary, jurisdiction: bestJurisdiction };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const { startup_id } = body;

    let query = supabase
      .from("startups")
      .select("id, company_name, legal_entity_name, registration_number, country, profile_published");

    if (startup_id) {
      query = query.eq("id", startup_id);
    } else {
      query = query.eq("profile_published", true);
    }

    const { data: startups, error } = await query;
    if (error || !startups?.length) {
      return new Response(
        JSON.stringify({ message: "No startups to check", checked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking ${startups.length} startups`);
    let checkedCount = 0;
    const results = [];

    for (const startup of startups) {
      const searchName = startup.legal_entity_name ?? startup.company_name;
      const country = startup.country ?? "";

      console.log(`Checking: ${searchName} (${country})`);

      // Structured checks run in parallel; DIFC is always attempted
      const [ocResult, chResult, difcResult] = await Promise.all([
        checkOpenCorporates(searchName, country),
        checkCompaniesHouse(searchName),
        checkDIFC(searchName),
      ]);

      const { verified, confidence, summary, jurisdiction } = calculateVerification(
        ocResult, chResult, difcResult.score_confidence, difcResult.difc_found, "ae_difc"
      );

      const sources: any[] = [];
      if (ocResult.found) sources.push({ registry: "OpenCorporates", url: ocResult.url, jurisdiction: ocResult.jurisdiction, status: ocResult.status, retrieved_at: new Date().toISOString() });
      if (chResult.found) sources.push({ registry: "UK Companies House", url: chResult.url, company_number: chResult.number, status: chResult.status, retrieved_at: new Date().toISOString() });
      if (difcResult.difc_found) sources.push({ registry: "DIFC (best-effort web search)", url: difcResult.difc_source_url ?? "https://www.difc.ae/business/public-register/", status: difcResult.difc_status, confidence: difcResult.difc_confidence, retrieved_at: new Date().toISOString() });

      // Upsert — writes all standard columns + the four new DIFC columns
      await supabase.from("company_registry_checks").upsert({
        startup_id: startup.id,
        company_name_searched: searchName,
        country,
        opencorporates_found: ocResult.found,
        opencorporates_status: ocResult.status,
        opencorporates_jurisdiction: ocResult.jurisdiction,
        opencorporates_registered_date: ocResult.registeredDate,
        opencorporates_url: ocResult.url,
        companies_house_found: chResult.found,
        companies_house_status: chResult.status,
        companies_house_number: chResult.number,
        companies_house_url: chResult.url,
        difc_found: difcResult.difc_found,
        difc_status: difcResult.difc_status,
        difc_check_method: difcResult.difc_check_method,
        difc_confidence: difcResult.difc_confidence,
        difc_source_url: difcResult.difc_source_url,
        difc_checked_at: difcResult.difc_checked_at,
        verified,
        verified_jurisdiction: jurisdiction,
        verification_summary: summary,
        confidence_score: confidence,
        sources,
        checked_at: new Date().toISOString(),
      }, { onConflict: "startup_id" });

      await supabase.from("startups").update({
        registry_verified: verified,
        registry_verified_at: verified ? new Date().toISOString() : null,
        registry_jurisdiction: jurisdiction || null,
      }).eq("id", startup.id);

      const { data: startup_full } = await supabase.from("startups").select("founder_id").eq("id", startup.id).single();
      if (startup_full?.founder_id) {
        await supabase.from("notifications").insert({
          user_id: startup_full.founder_id,
          kind: "verification",
          type: "registry_check",
          title: verified
            ? `Company registration signal found for ${startup.company_name}`
            : `Registry check complete for ${startup.company_name}`,
          body: verified
            ? `Registration signals found with ${confidence}% confidence. ${summary}`
            : `No registration found in checked registries. ${summary}`,
          read: false,
          action_url: "/app/profile",
        });
      }

      checkedCount++;
      results.push({ company: searchName, verified, confidence, opencorporates: ocResult.found, companies_house: chResult.found, difc: difcResult.difc_found, difc_method: difcResult.difc_check_method, difc_confidence_level: difcResult.difc_confidence });

      await new Promise((r) => setTimeout(r, 500));
    }

    return new Response(
      JSON.stringify({ message: "Registry check complete", checkedCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
