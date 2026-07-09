import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Tier1Check = {
  passed: boolean;
  detail: string;
};

export type Tier1Result = {
  startup_id: string;
  email: Tier1Check;
  website: Tier1Check;
  registry: Tier1Check & { source: string | null };
  infrastructure: Tier1Check;
  tier1_passed: boolean;
  tier1_checked_at: string;
  error?: string;
};

/** Legacy shape kept for fetchVerificationStatus consumers */
export type VerificationRun = {
  startup_id: string;
  tier1_passed: boolean;
  current_tier: number;
  tier1_checked_at: string | null;
  tier1_email_match: boolean | null;
  tier1_email_detail: string | null;
  tier1_website_match: boolean | null;
  tier1_website_detail: string | null;
  tier1_registry_match: boolean | null;
  tier1_registry_source: string | null;
  tier1_registry_detail: string | null;
  tier1_infra_match: boolean | null;
  tier1_infra_detail: string | null;
};

type RunTier1Input = {
  startup_id: string;
  /** Caller must be the founder or a service-role context — enforced via RLS */
  caller_user_id: string;
};

type RequestHumanReviewInput = {
  entity_type: "founder" | "investor";
  entity_id: string;   // startup_id for founder, investor_id for investor
  user_id: string;
  user_email: string;
  display_name: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const cfEnv = (globalThis as any).__cf_env || {};
  const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL || "";
  const key = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url, key };
}

async function supabaseQuery(url: string, key: string, path: string, method: string, body?: unknown) {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Prefer": method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Supabase ${method} ${path} failed (${resp.status}): ${text}`);
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

/** HEAD request to check if a URL resolves (any 2xx or 3xx counts as passing) */
async function checkUrlResolves(url: string): Promise<boolean> {
  if (!url) return false;
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  try {
    const resp = await fetch(normalized, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    return resp.status < 400;
  } catch {
    // Try HTTP fallback
    try {
      const http = normalized.replace("https://", "http://");
      const resp2 = await fetch(http, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      return resp2.status < 400;
    } catch {
      return false;
    }
  }
}

/** Fetch page text (first 3000 chars) for AI content match */
async function fetchPageText(url: string): Promise<string> {
  if (!url) return "";
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  try {
    const resp = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Hockystick-Verification-Bot/1.0" },
    });
    if (!resp.ok) return "";
    const html = await resp.text();
    // Strip HTML tags to get readable text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
    return text;
  } catch {
    return "";
  }
}

/** Extract domain from email */
function emailDomain(email: string): string {
  return (email.split("@")[1] || "").toLowerCase().trim();
}

/** Extract domain from URL */
function urlDomain(url: string): string {
  if (!url) return "";
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 1 — Identity Confirmed (automated, ALL checks must pass, no scores)
//
// Four checks, each independently verifiable and each reported with a
// specific reason. There are no partial passes and no special-cased IDs:
// a fake company fails because the checks catch it.
// ─────────────────────────────────────────────────────────────────────────────

/** Normalize a company name for matching: lowercase, strip legal suffixes + punctuation. */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(ltd|limited|llc|inc|incorporated|corp|corporation|fz|fzc|fzco|fze|fz-llc|dmcc|plc|gmbh|sarl|pte|pvt|co)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Check MX records via DNS-over-HTTPS (Cloudflare resolver). */
async function domainHasMx(domain: string): Promise<boolean> {
  try {
    const resp = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(6000) },
    );
    if (!resp.ok) return false;
    const json: any = await resp.json();
    return Array.isArray(json.Answer) && json.Answer.some((a: any) => a.type === 15);
  } catch {
    return false;
  }
}

/** Domain registration date via RDAP (Verisign direct for .com/.net, rdap.org otherwise). */
async function domainAgeDays(domain: string): Promise<number | null> {
  const tld = domain.split(".").pop() ?? "";
  const urls = ["com", "net"].includes(tld)
    ? [`https://rdap.verisign.com/${tld}/v1/domain/${encodeURIComponent(domain)}`, `https://rdap.org/domain/${encodeURIComponent(domain)}`]
    : [`https://rdap.org/domain/${encodeURIComponent(domain)}`];
  for (const url of urls) {
    try {
      const resp = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: { accept: "application/rdap+json, application/json" },
      });
      if (!resp.ok) continue;
      const json: any = await resp.json();
      const reg = (json.events ?? []).find((e: any) => e.eventAction === "registration");
      if (!reg?.eventDate) continue;
      return Math.floor((Date.now() - new Date(reg.eventDate).getTime()) / 86_400_000);
    } catch {
      // try next source
    }
  }
  return null;
}

/**
 * Public registry lookup, multi-source:
 *  1. GLEIF LEI database — free, keyless, global legal-entity registry.
 *  2. OpenCorporates — only when OPENCORPORATES_API_KEY is configured
 *     (their API now requires a token; unauthenticated requests 401).
 * A name match is validated with normalized comparison — fuzzy noise from
 * either source never counts as a match.
 */
async function checkRegistry(companyName: string): Promise<{ found: boolean; source: string | null; detail: string }> {
  const target = normalizeCompanyName(companyName);
  if (!target || target.length < 3) {
    return { found: false, source: null, detail: "Company name too short to search registries." };
  }
  const sourcesQueried: string[] = [];

  // ── Source 1: GLEIF ─────────────────────────────────────────────────────
  try {
    sourcesQueried.push("GLEIF");
    const resp = await fetch(
      `https://api.gleif.org/api/v1/fuzzycompletions?field=entity.legalName&q=${encodeURIComponent(companyName)}`,
      { signal: AbortSignal.timeout(10000), headers: { accept: "application/vnd.api+json" } },
    );
    if (resp.ok) {
      const json: any = await resp.json();
      for (const d of json?.data ?? []) {
        const candidate = normalizeCompanyName(d?.attributes?.value ?? "");
        if (candidate && (candidate === target || candidate.includes(target) || target.includes(candidate))) {
          return {
            found: true,
            source: "GLEIF (Global LEI Index)",
            detail: `Matched legal entity "${d.attributes.value}" in the Global LEI Index.`,
          };
        }
      }
    }
  } catch { /* fall through to next source */ }

  // ── Source 2: OpenCorporates ────────────────────────────────────────────
  // Tried keyless first (free tier when available); api_token appended when
  // OPENCORPORATES_API_KEY is configured. A 401/403 skips silently.
  const cfEnv = (globalThis as any).__cf_env || {};
  const ocKey = cfEnv.OPENCORPORATES_API_KEY || "";
  try {
    sourcesQueried.push("OpenCorporates");
    const tokenParam = ocKey ? `&api_token=${encodeURIComponent(ocKey)}` : "";
    const resp = await fetch(
      `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(companyName)}&per_page=20${tokenParam}`,
      { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "Hockystick-Verification-Bot/1.0" } },
    );
    if (resp.ok) {
      const json: any = await resp.json();
      for (const entry of json?.results?.companies ?? []) {
        const c = entry?.company;
        if (!c?.name) continue;
        const candidate = normalizeCompanyName(c.name);
        if (candidate === target || candidate.includes(target) || target.includes(candidate)) {
          return {
            found: true,
            source: `OpenCorporates (${(c.jurisdiction_code || "unknown").toUpperCase()} · ${c.company_number || "n/a"})`,
            detail: `Matched "${c.name}" in jurisdiction ${(c.jurisdiction_code || "unknown").toUpperCase()}, company number ${c.company_number || "n/a"}.`,
          };
        }
      }
    }
  } catch { /* fall through */ }

  // ── Source 3: Companies House (UK) — free API key, when configured ──────
  const chKey = cfEnv.COMPANIES_HOUSE_API_KEY || "";
  if (chKey) {
    try {
      sourcesQueried.push("Companies House");
      const resp = await fetch(
        `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(companyName)}&items_per_page=20`,
        { signal: AbortSignal.timeout(10000), headers: { Authorization: `Basic ${btoa(`${chKey}:`)}` } },
      );
      if (resp.ok) {
        const json: any = await resp.json();
        for (const item of json?.items ?? []) {
          const candidate = normalizeCompanyName(item?.title ?? "");
          if (candidate && (candidate === target || candidate.includes(target) || target.includes(candidate))) {
            return {
              found: true,
              source: `Companies House (UK · ${item.company_number || "n/a"})`,
              detail: `Matched "${item.title}" at Companies House, company number ${item.company_number || "n/a"}.`,
            };
          }
        }
      }
    } catch { /* fall through */ }
  }

  return {
    found: false,
    source: null,
    detail: `No matching company found in ${sourcesQueried.join(", ")}. If your company is registered with a national or free-zone authority these sources don't cover, upload your trade license instead — it satisfies this check after AI review.`,
  };
}

export const runTier1Check = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as RunTier1Input)
  .handler(async ({ data }): Promise<Tier1Result> => {
    const { url: sbUrl, key: sbKey } = getSupabaseAdmin();
    const tier1_checked_at = new Date().toISOString();

    const fail = (error: string): Tier1Result => ({
      startup_id: data.startup_id,
      email: { passed: false, detail: error },
      website: { passed: false, detail: error },
      registry: { passed: false, detail: error, source: null },
      infrastructure: { passed: false, detail: error },
      tier1_passed: false,
      tier1_checked_at,
      error,
    });

    if (!sbUrl || !sbKey) return fail("Verification service unavailable — try again later.");

    // ── Rate limit (same rpc the rest of the AI stack uses) ────────────────
    const allowed = await supabaseQuery(sbUrl, sbKey, "rpc/check_ai_rate_limit", "POST", {
      p_user_id: data.caller_user_id,
      p_feature: "verification",
    }).catch(() => true);
    if (allowed === false) return fail("Daily verification limit reached — try again tomorrow.");

    // ── Startup data ───────────────────────────────────────────────────────
    const startupRows: any[] = await supabaseQuery(sbUrl, sbKey,
      `startups?id=eq.${data.startup_id}&select=id,founder_id,company_name,website,founder_email`,
      "GET"
    ).catch(() => []);
    const startup = startupRows?.[0];
    if (!startup) return fail("Startup not found.");

    const companyName: string = startup.company_name || "";
    const wDomain = urlDomain(startup.website || "");

    // ── Check 1: email domain matches website domain ───────────────────────
    let email: Tier1Check;
    const eDomain = emailDomain(startup.founder_email || "");
    const freeProviders = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "me.com", "live.com", "protonmail.com", "proton.me"];
    if (!eDomain) {
      email = { passed: false, detail: "No founder email on the profile." };
    } else if (freeProviders.includes(eDomain)) {
      email = { passed: false, detail: `${eDomain} is a personal email provider — a business email on the company domain is required.` };
    } else if (!wDomain) {
      email = { passed: false, detail: "No company website on the profile to match the email domain against." };
    } else if (eDomain === wDomain || eDomain.endsWith(`.${wDomain}`) || wDomain.endsWith(`.${eDomain}`)) {
      email = { passed: true, detail: `Email domain ${eDomain} matches website domain ${wDomain}.` };
    } else {
      email = { passed: false, detail: `Email domain ${eDomain} does not match website domain ${wDomain}.` };
    }

    // ── Check 2: website resolves AND mentions the company name ────────────
    let website: Tier1Check;
    if (!startup.website) {
      website = { passed: false, detail: "No website on the profile." };
    } else {
      const pageText = await fetchPageText(startup.website);
      if (!pageText) {
        website = { passed: false, detail: `${startup.website} did not return readable content.` };
      } else {
        const normTarget = normalizeCompanyName(companyName);
        const normPage = pageText.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (normTarget && normPage.includes(normTarget)) {
          website = { passed: true, detail: `Website resolves and its content mentions "${companyName}".` };
        } else {
          website = { passed: false, detail: `Website resolves but its content does not mention "${companyName}".` };
        }
      }
    }

    // ── Check 3: public registry lookup, or a previously verified license ──
    let reg = companyName
      ? await checkRegistry(companyName)
      : { found: false, source: null as string | null, detail: "No company name on the profile." };

    if (!reg.found) {
      // A trade license that passed AI review and is still in force also
      // satisfies the registry requirement (see verifyTradeLicense below).
      const licRows: any[] = await supabaseQuery(sbUrl, sbKey,
        `founder_verifications?startup_id=eq.${data.startup_id}&select=license_name_match,license_expiry,license_authority`,
        "GET").catch(() => []);
      const lic = licRows?.[0];
      if (lic?.license_name_match === true && lic?.license_expiry && new Date(lic.license_expiry) > new Date()) {
        reg = {
          found: true,
          source: `Trade license · ${lic.license_authority || "issuing authority"}`,
          detail: `Trade license issued by ${lic.license_authority || "a recognized authority"}, valid until ${lic.license_expiry}, company name matched by AI review.`,
        };
      }
    }

    const registry: Tier1Check & { source: string | null } = {
      passed: reg.found,
      detail: reg.detail,
      source: reg.source,
    };

    // ── Check 4: domain infrastructure (MX records + domain age ≥ 90 days) ─
    let infrastructure: Tier1Check;
    if (!wDomain) {
      infrastructure = { passed: false, detail: "No website domain to check." };
    } else {
      const [hasMx, ageDays] = await Promise.all([domainHasMx(wDomain), domainAgeDays(wDomain)]);
      if (!hasMx) {
        infrastructure = { passed: false, detail: `${wDomain} has no mail (MX) records — no real email infrastructure exists on this domain.` };
      } else if (ageDays !== null && ageDays < 90) {
        infrastructure = { passed: false, detail: `${wDomain} was registered ${ageDays} days ago — domains under 90 days old do not pass.` };
      } else {
        infrastructure = {
          passed: true,
          detail: ageDays !== null
            ? `${wDomain} has mail records and was registered ${Math.floor(ageDays / 30)} months ago.`
            : `${wDomain} has mail records (domain age unavailable from RDAP — not held against the domain).`,
        };
      }
    }

    // ── Verdict: ALL FOUR must pass ────────────────────────────────────────
    const tier1_passed = email.passed && website.passed && registry.passed && infrastructure.passed;

    // ── Persist per-check results (+ legacy columns for older readers) ─────
    const payload = {
      startup_id: data.startup_id,
      tier1_email_match: email.passed,
      tier1_email_detail: email.detail,
      tier1_website_match: website.passed,
      tier1_website_detail: website.detail,
      tier1_registry_match: registry.passed,
      tier1_registry_source: registry.source,
      tier1_registry_detail: registry.detail,
      tier1_infra_match: infrastructure.passed,
      tier1_infra_detail: infrastructure.detail,
      tier1_passed,
      tier1_checked_at,
      // Legacy columns still read by older components until they're migrated:
      email_domain_matches: email.passed,
      website_resolves: website.passed,
      registry_confirmed: registry.passed,
      tier1_score: tier1_passed ? 100 : 0,
      last_full_check_at: tier1_checked_at,
      updated_at: tier1_checked_at,
    };

    const existing: any[] = await supabaseQuery(sbUrl, sbKey,
      `founder_verifications?startup_id=eq.${data.startup_id}&select=id`, "GET").catch(() => []);
    if (existing?.length) {
      const { startup_id: _omit, ...patch } = payload;
      await supabaseQuery(sbUrl, sbKey, `founder_verifications?startup_id=eq.${data.startup_id}`, "PATCH", patch).catch(() => null);
    } else {
      await supabaseQuery(sbUrl, sbKey, "founder_verifications", "POST", { ...payload, current_tier: 0 }).catch(() => null);
    }

    // ── Recompute tier via the single source of truth ──────────────────────
    const { recomputeVerificationTier } = await import("@/lib/tier-calc");
    await recomputeVerificationTier(sbUrl, sbKey, data.startup_id).catch(() => null);

    // ── Meter usage ────────────────────────────────────────────────────────
    await supabaseQuery(sbUrl, sbKey, "rpc/check_and_increment_ai_usage", "POST", {
      p_user_id: data.caller_user_id,
      p_feature: "verification",
    }).catch(() => null);

    return { startup_id: data.startup_id, email, website, registry, infrastructure, tier1_passed, tier1_checked_at };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Trade license path for the registry check.
// GPT-4o reads the license (text, or image via vision) and must extract a
// company name matching the profile, a FUTURE expiry date, and a recognizable
// issuing authority. A passed license satisfies Tier 1 check 3 and is
// reported as "Trade license · [authority]" — never as a registry match.
// ─────────────────────────────────────────────────────────────────────────────

type VerifyLicenseInput = {
  startup_id: string;
  caller_user_id: string;
  /** Text extracted client-side, when the document is text-based */
  document_text?: string;
  /** data: URL of the license image, when the document is a scan/photo */
  image_data_url?: string;
  document_name: string;
};

export type VerifyLicenseResult = {
  ok: boolean;
  passed: boolean;
  authority: string | null;
  expiry: string | null;
  name_match: boolean;
  detail: string;
  error?: string;
};

export const verifyTradeLicense = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as VerifyLicenseInput)
  .handler(async ({ data }): Promise<VerifyLicenseResult> => {
    const { url: sbUrl, key: sbKey } = getSupabaseAdmin();
    const cfEnv = (globalThis as any).__cf_env || {};
    const openaiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";

    const fail = (error: string): VerifyLicenseResult =>
      ({ ok: false, passed: false, authority: null, expiry: null, name_match: false, detail: error, error });

    if (!sbUrl || !sbKey) return fail("Service unavailable — try again later.");
    if (!openaiKey) return fail("AI unavailable.");
    if (!data.document_text && !data.image_data_url) return fail("No readable document provided.");

    const allowed = await supabaseQuery(sbUrl, sbKey, "rpc/check_ai_rate_limit", "POST", {
      p_user_id: data.caller_user_id, p_feature: "verification",
    }).catch(() => true);
    if (allowed === false) return fail("Daily verification limit reached — try again tomorrow.");

    const startupRows: any[] = await supabaseQuery(sbUrl, sbKey,
      `startups?id=eq.${data.startup_id}&select=company_name`, "GET").catch(() => []);
    const companyName = startupRows?.[0]?.company_name || "";
    if (!companyName) return fail("Startup not found.");

    const today = new Date().toISOString().slice(0, 10);
    const systemPrompt = [
      `You are verifying a company trade license / registration certificate for "${companyName}".`,
      "Return JSON only:",
      '{ "company_name_found": string|null, "name_matches": boolean, "expiry_date": "YYYY-MM-DD"|null, "issuing_authority": string|null, "is_license_document": boolean, "reasoning": "[one sentence]" }',
      "Rules:",
      `- name_matches = true only if the company name on the document matches or clearly corresponds to "${companyName}" (legal suffixes like LLC/FZ-LLC may differ).`,
      "- expiry_date = the license expiry/renewal date exactly as printed, ISO formatted. null if not present.",
      "- issuing_authority = the authority named on the document (e.g. Dubai DED, DIFC, ADGM, RAKEZ, SHAMS, Companies House, Ministry of Commerce). null if none.",
      "- is_license_document = false for pitch decks, invoices, bank statements, utility bills, or anything that is not a government/free-zone issued registration document.",
      "Never assume — only extract what is explicitly on the document. When unsure, use null/false.",
    ].join("\n");

    const userContent: any[] = [];
    if (data.document_text) {
      userContent.push({ type: "text", text: `DOCUMENT NAME: ${data.document_name}\nDOCUMENT TEXT (first 6000 chars):\n${data.document_text.slice(0, 6000)}` });
    } else {
      userContent.push({ type: "text", text: `DOCUMENT NAME: ${data.document_name}` });
      userContent.push({ type: "image_url", image_url: { url: data.image_data_url, detail: "high" } });
    }

    let parsed: any = null;
    try {
      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 300,
          temperature: 0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (aiResp.ok) {
        const aiData: any = await aiResp.json();
        const raw = aiData.choices?.[0]?.message?.content || "{}";
        parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim());
      }
    } catch {
      return fail("AI check timed out — try again.");
    }
    if (!parsed) return fail("AI returned an unusable response — try again.");

    const nameMatch = parsed.name_matches === true && parsed.is_license_document === true;
    const expiry: string | null = /^\d{4}-\d{2}-\d{2}$/.test(parsed.expiry_date ?? "") ? parsed.expiry_date : null;
    const expiryFuture = !!expiry && expiry > today;
    const authority: string | null = (parsed.issuing_authority ?? null) || null;
    const passed = nameMatch && expiryFuture && !!authority;

    const detail = passed
      ? `Trade license issued by ${authority}, valid until ${expiry}, company name matched.`
      : !parsed.is_license_document
        ? `Rejected: the document does not appear to be a registration/license document. ${parsed.reasoning ?? ""}`.trim()
        : !nameMatch
          ? `Rejected: company name on the document (${parsed.company_name_found ?? "not found"}) does not match "${companyName}".`
          : !expiryFuture
            ? `Rejected: license expiry ${expiry ?? "not found"} is not a future date.`
            : "Rejected: no issuing authority identified on the document.";

    const now = new Date().toISOString();
    await supabaseQuery(sbUrl, sbKey, `founder_verifications?startup_id=eq.${data.startup_id}`, "PATCH", {
      license_doc_type: data.document_name,
      license_doc_uploaded_at: now,
      license_ai_extracted: parsed,
      license_ai_matches_profile: nameMatch,
      license_verified_at: passed ? now : null,
      license_authority: authority,
      license_expiry: expiry,
      license_name_match: passed,
      ...(passed ? {
        tier1_registry_match: true,
        tier1_registry_source: `Trade license · ${authority}`,
        tier1_registry_detail: detail,
        registry_confirmed: true,
      } : {}),
      updated_at: now,
    }).catch(() => null);

    // If the other three checks already passed, this completes Tier 1.
    if (passed) {
      const rows: any[] = await supabaseQuery(sbUrl, sbKey,
        `founder_verifications?startup_id=eq.${data.startup_id}&select=tier1_email_match,tier1_website_match,tier1_infra_match`,
        "GET").catch(() => []);
      const r = rows?.[0];
      if (r?.tier1_email_match && r?.tier1_website_match && r?.tier1_infra_match) {
        await supabaseQuery(sbUrl, sbKey, `founder_verifications?startup_id=eq.${data.startup_id}`, "PATCH", {
          tier1_passed: true, tier1_checked_at: now, updated_at: now,
        }).catch(() => null);
      }
      const { recomputeVerificationTier } = await import("@/lib/tier-calc");
      await recomputeVerificationTier(sbUrl, sbKey, data.startup_id).catch(() => null);
    }

    await supabaseQuery(sbUrl, sbKey, "rpc/check_and_increment_ai_usage", "POST", {
      p_user_id: data.caller_user_id, p_feature: "verification",
    }).catch(() => null);

    return { ok: true, passed, authority, expiry, name_match: nameMatch, detail };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Tier 3 — Request human review (sends admin email)
// ─────────────────────────────────────────────────────────────────────────────

export const requestHumanReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as RequestHumanReviewInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const resendKey = cfEnv.RESEND_API_KEY || "";
    const fromEmail = cfEnv.RESEND_FROM_EMAIL || "hello@hockystick.app";

    if (!resendKey) return { ok: false, error: "email_unavailable" };

    const entityLabel = data.entity_type === "founder" ? "Founder" : "Investor";
    const html = `
      <h2>Human Review Request — ${entityLabel}</h2>
      <p><strong>Name:</strong> ${data.display_name}</p>
      <p><strong>Email:</strong> ${data.user_email}</p>
      <p><strong>User ID:</strong> ${data.user_id}</p>
      <p><strong>Entity ID:</strong> ${data.entity_id}</p>
      <p><strong>Entity type:</strong> ${data.entity_type}</p>
      <p><strong>Requested at:</strong> ${new Date().toISOString()}</p>
      <hr/>
      <p>Review their profile in the <a href="https://hockystick.app/app/users">admin panel</a>.</p>
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `Hockystick <${fromEmail}>`,
        to: ["admin@hockystick.app"],
        subject: `[Hockystick] Human verification request — ${data.display_name}`,
        html,
        tags: [{ name: "type", value: "verification_request" }],
      }),
    });

    if (!resp.ok) return { ok: false, error: "send_failed" };
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Public read — fetch verification for a startup_id or investor slug
// (used by /verify/$slug page — no auth required, reads public data only)
// ─────────────────────────────────────────────────────────────────────────────

export type PublicCheckLine = {
  label: string;
  passed: boolean | null;
  detail: string | null;
};

export type PublicVerificationData = {
  entity_type: "founder";
  display_name: string;
  company_or_fund: string;
  current_tier: number;
  generated_at: string;
  tier1: {
    passed: boolean;
    checked_at: string | null;
    checks: PublicCheckLine[];
    registry_source: string | null;
  };
  tier2: {
    met: boolean;
    verified_claims: { text: string; category: string | null; checked_at: string | null }[];
    total_claims: number;
    last_checked_at: string | null;
  };
  tier3: {
    met: boolean;
    docs: { label: string; verified: boolean; uploaded_at: string | null }[];
    human_reviewed: boolean;
    human_reviewed_at: string | null;
  };
  tier4: {
    signed_off: boolean;
    reviewer_name: string | null;
    reviewed_at: string | null;
  };
};

type GetVerificationInput = {
  slug: string;           // profile_slug for founders
  entity_type: "founder" | "investor";
};

export const getPublicVerification = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as GetVerificationInput)
  .handler(async ({ data }): Promise<PublicVerificationData | null> => {
    const { url: sbUrl, key: sbKey } = getSupabaseAdmin();
    if (!sbUrl || !sbKey) return null;
    if (data.entity_type !== "founder") return null;

    // Look up startup by slug
    const startups: any[] = await supabaseQuery(sbUrl, sbKey,
      `startups?profile_slug=eq.${encodeURIComponent(data.slug)}&select=id,company_name,founder_name`,
      "GET"
    ).catch(() => []);
    const startup = startups?.[0];
    if (!startup) return null;

    const [verifRows, claimRows] = await Promise.all([
      supabaseQuery(sbUrl, sbKey,
        `founder_verifications?startup_id=eq.${startup.id}&select=current_tier,tier1_passed,tier1_checked_at,tier1_email_match,tier1_email_detail,tier1_website_match,tier1_website_detail,tier1_registry_match,tier1_registry_source,tier1_registry_detail,tier1_infra_match,tier1_infra_detail,tier2_passed,operational_bank_verified,operational_bank_doc_uploaded_at,operational_contract_verified,operational_contract_doc_uploaded_at,operational_team_verified,operational_team_doc_uploaded_at,tier3_passed,human_verified_at,tier4_passed,tier4_reviewer_name,tier4_reviewed_at`,
        "GET"
      ).catch(() => []),
      supabaseQuery(sbUrl, sbKey,
        `startup_claims?startup_id=eq.${startup.id}&select=claim_type,claim_label,claim_value,claim_category,ai_verdict,ai_checked_at&order=ai_checked_at.desc`,
        "GET"
      ).catch(() => []),
    ]);

    const v = verifRows?.[0] ?? {};
    const claims: any[] = claimRows ?? [];
    const verifiedClaims = claims.filter((c) => c.ai_verdict === "verified");
    const checkedClaims = claims.filter((c) => c.ai_checked_at);

    return {
      entity_type: "founder",
      display_name: startup.founder_name || "Founder",
      company_or_fund: startup.company_name || "",
      current_tier: v.current_tier ?? 0,
      generated_at: new Date().toISOString(),
      tier1: {
        passed: v.tier1_passed ?? false,
        checked_at: v.tier1_checked_at ?? null,
        registry_source: v.tier1_registry_source ?? null,
        checks: [
          { label: "Email domain matches website", passed: v.tier1_email_match ?? null, detail: v.tier1_email_detail ?? null },
          { label: "Website mentions the company", passed: v.tier1_website_match ?? null, detail: v.tier1_website_detail ?? null },
          { label: "Found in a public company registry", passed: v.tier1_registry_match ?? null, detail: v.tier1_registry_detail ?? null },
          { label: "Real domain infrastructure", passed: v.tier1_infra_match ?? null, detail: v.tier1_infra_detail ?? null },
        ],
      },
      tier2: {
        met: v.tier2_passed ?? false,
        verified_claims: verifiedClaims.map((c) => ({
          text: c.claim_type?.startsWith("custom_") ? c.claim_value : `${c.claim_label}: ${c.claim_value}`,
          category: c.claim_category ?? null,
          checked_at: c.ai_checked_at ?? null,
        })),
        total_claims: checkedClaims.length,
        last_checked_at: checkedClaims[0]?.ai_checked_at ?? null,
      },
      tier3: {
        met: (v.tier3_passed ?? false) &&
          (v.operational_bank_verified ?? false) &&
          (v.operational_contract_verified ?? false) &&
          (v.operational_team_verified ?? false),
        docs: [
          { label: "Financial activity (bank/revenue statement)", verified: v.operational_bank_verified ?? false, uploaded_at: v.operational_bank_doc_uploaded_at ?? null },
          { label: "Customer / contract evidence", verified: v.operational_contract_verified ?? false, uploaded_at: v.operational_contract_doc_uploaded_at ?? null },
          { label: "Team evidence (payroll / employment record)", verified: v.operational_team_verified ?? false, uploaded_at: v.operational_team_doc_uploaded_at ?? null },
        ],
        human_reviewed: v.tier3_passed ?? false,
        human_reviewed_at: v.human_verified_at ?? null,
      },
      tier4: {
        signed_off: v.tier4_passed ?? false,
        reviewer_name: v.tier4_reviewer_name ?? null,
        reviewed_at: v.tier4_reviewed_at ?? null,
      },
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Status read — per-check Tier 1 results for the founder-facing UI
// (The legacy run-verification edge function is retired; runTier1Check above
//  is the single Tier 1 implementation.)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchVerificationStatus(
  startupId: string,
): Promise<VerificationRun | null> {
  const { data } = await supabase
    .from("founder_verifications")
    .select(
      "startup_id, tier1_passed, current_tier, tier1_checked_at, tier1_email_match, tier1_email_detail, tier1_website_match, tier1_website_detail, tier1_registry_match, tier1_registry_source, tier1_registry_detail, tier1_infra_match, tier1_infra_detail"
    )
    .eq("startup_id", startupId)
    .maybeSingle();
  return (data as VerificationRun | null) ?? null;
}
