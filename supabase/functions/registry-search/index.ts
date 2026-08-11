import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// DIFC / OpenAI branch REMOVED 11 Aug 2026 — see CLAUDE.md §19d.
//
// This function is CORRECTED, not stubbed. It backs a real public page
// (/registry — "Free. No account required.", linked from the site footer) which
// authenticates with the hardcoded public anon key by design. That made the
// endpoint effectively public, which is correct for OpenCorporates and UK
// Companies House (key-free public registry APIs) and NOT correct for the DIFC
// check, which called OpenAI — meaning any anonymous visitor could spend the
// project's OpenAI key by typing a company name.
//
// The exposure was one branch of a legitimate function, not a defective
// function entire, so the branch was removed rather than the function retired.
// OPENAI_API_KEY is no longer referenced anywhere in this file.
//
// The DIFC lookup was in any case the weakest of the three sources: it scraped
// the public register page plus a DuckDuckGo result set and asked a model
// whether the name appeared, converting a confidence label into a score
// (high 45 / medium 30 / low 15). Reinstating it needs a real DIFC data source,
// not an AI reading a search page.
//
// ⚠️ SEPARATE OPEN FINDING, not introduced by this change — see CLAUDE.md §19d:
// BOTH remaining sources return 401 to this function and always have. Neither
// fetch below sends an API key, and both APIs require one (verified 11 Aug 2026
// by calling them directly: OpenCorporates 401, Companies House 401). The
// original code had the same omission, which means the DIFC/OpenAI branch was
// the ONLY source that ever produced a result on this page. With it removed,
// /registry returns "No company registration found in checked registries" for
// every query. That is honest — it does not fabricate — but the page promises a
// working registry check it cannot currently perform. Needs a product decision:
// obtain API credentials, or take the page down. Not decided here.

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

async function checkOpenCorporates(name, country) {
  try {
    const jurisdictionMap = { "UAE": "ae", "United Arab Emirates": "ae", "UK": "gb", "United Kingdom": "gb", "US": "us", "USA": "us", "United States": "us", "Saudi Arabia": "sa", "Bahrain": "bh", "Qatar": "qa", "Kuwait": "kw", "Oman": "om" };
    const jCode = jurisdictionMap[country] ?? "";
    const q = encodeURIComponent(name);
    const url = jCode ? `https://api.opencorporates.com/v0.4/companies/search?q=${q}&jurisdiction_code=${jCode}&per_page=5` : `https://api.opencorporates.com/v0.4/companies/search?q=${q}&per_page=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { found: false, status: "api_error", jurisdiction: "", registeredDate: "", url: "", confidence: 0 };
    const data = await res.json();
    const companies = data?.results?.companies ?? [];
    if (!companies.length) return { found: false, status: "not_found", jurisdiction: "", registeredDate: "", url: "", confidence: 0 };
    const clean = name.toLowerCase().trim();
    let best = companies[0]?.company; let confidence = 60;
    for (const item of companies) { const n = (item.company.name ?? "").toLowerCase(); if (n === clean) { best = item.company; confidence = 90; break; } if (n.includes(clean) || clean.includes(n)) { best = item.company; confidence = 75; } }
    const active = best.current_status?.toLowerCase().match(/active|live|registered/);
    return { found: true, status: best.current_status ?? "unknown", jurisdiction: best.jurisdiction_code ?? "", registeredDate: best.incorporation_date ?? "", url: best.opencorporates_url ?? "", confidence: active ? confidence : Math.round(confidence * 0.7) };
  } catch { return { found: false, status: "error", jurisdiction: "", registeredDate: "", url: "", confidence: 0 }; }
}

async function checkCompaniesHouse(name) {
  try {
    const res = await fetch(`https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(name)}&items_per_page=5`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { found: false, status: "api_error", number: "", url: "", confidence: 0 };
    const data = await res.json();
    const items = data?.items ?? [];
    if (!items.length) return { found: false, status: "not_found", number: "", url: "", confidence: 0 };
    const clean = name.toLowerCase().trim();
    let best = items[0]; let confidence = 55;
    for (const item of items) { const n = (item.title ?? "").toLowerCase(); if (n === clean) { best = item; confidence = 88; break; } if (n.includes(clean) || clean.includes(n)) { best = item; confidence = 70; } }
    return { found: true, status: best.company_status ?? "unknown", number: best.company_number ?? "", url: `https://find-and-update.company-information.service.gov.uk/company/${best.company_number}`, confidence: best.company_status === "active" ? confidence : Math.round(confidence * 0.6) };
  } catch { return { found: false, status: "error", number: "", url: "", confidence: 0 }; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { company_name, country = "" } = await req.json();
    if (!company_name || company_name.trim().length < 2) return new Response(JSON.stringify({ error: "company_name required (min 2 chars)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const name = company_name.trim();
    const [oc, ch] = await Promise.all([checkOpenCorporates(name, country), checkCompaniesHouse(name)]);
    const maxConf = Math.max(oc.confidence, ch.confidence);
    const verified = maxConf >= 60;
    const foundIn = [oc.found && `OpenCorporates (${oc.jurisdiction?.toUpperCase() || "global"})`, ch.found && "UK Companies House"].filter(Boolean);
    const summary = foundIn.length > 0 ? `Registration signal found via ${foundIn.join(", ")}. Confidence: ${maxConf}%. Source-cited, not manually confirmed.` : "No company registration found in checked registries. This does not confirm non-existence.";
    // difc retained in the response shape as an explicit not-checked marker so
    // the existing client render does not read `undefined` — see CLAUDE.md §19d.
    const difc = { found: false, status: "not_checked", confidence: 0, confidenceLabel: null, sourceUrl: null, method: "removed_11_aug_2026" };
    return new Response(JSON.stringify({ result: { company: name, opencorporates: oc, companies_house: ch, difc, verified, confidence: maxConf, summary } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) { return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
