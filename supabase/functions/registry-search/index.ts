import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const active = best.current_status?.toLowerCase().includes("active");
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { company_name, country = "" } = await req.json();

    if (!company_name || company_name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "company_name required (min 2 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const name = company_name.trim();

    const [oc, ch] = await Promise.all([
      checkOpenCorporates(name, country),
      checkCompaniesHouse(name),
    ]);

    // DIFC check
    let difc = { found: false, status: "unavailable", confidence: 0 };
    try {
      const difcRes = await fetch(
        `https://www.difc.ae/data/api/entity-search?q=${encodeURIComponent(name)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (difcRes.ok) {
        const d = await difcRes.json();
        const items = d?.data ?? d?.results ?? [];
        const clean = name.toLowerCase();
        const found = items.some((i: Record<string, string>) =>
          (i.name ?? i.entity_name ?? "").toLowerCase().includes(clean)
        );
        difc = { found, status: found ? "registered" : "not_found", confidence: found ? 80 : 0 };
      }
    } catch { /* DIFC often unavailable publicly */ }

    const maxConf = Math.max(oc.confidence, ch.confidence, difc.confidence);
    const verified = maxConf >= 60;

    const foundIn = [
      oc.found && `OpenCorporates (${oc.jurisdiction?.toUpperCase() || "global"})`,
      ch.found && "UK Companies House",
      difc.found && "DIFC Entity Register",
    ].filter(Boolean);

    const summary = foundIn.length > 0
      ? `Registration signal found via ${foundIn.join(", ")}. Confidence: ${maxConf}%. Source-cited, not manually confirmed.`
      : "No company registration found in checked registries. This does not confirm non-existence — registries may be incomplete or use different name formats.";

    return new Response(
      JSON.stringify({
        result: { company: name, opencorporates: oc, companies_house: ch, difc, verified, confidence: maxConf, summary },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
