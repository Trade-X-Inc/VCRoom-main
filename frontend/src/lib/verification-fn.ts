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

  // ── Source 2: OpenCorporates (requires API key) ─────────────────────────
  const cfEnv = (globalThis as any).__cf_env || {};
  const ocKey = cfEnv.OPENCORPORATES_API_KEY || "";
  if (ocKey) {
    try {
      sourcesQueried.push("OpenCorporates");
      const resp = await fetch(
        `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(companyName)}&per_page=20&api_token=${encodeURIComponent(ocKey)}`,
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
  }

  return {
    found: false,
    source: null,
    detail: `No matching company found in ${sourcesQueried.join(" or ")}.${ocKey ? "" : " (OpenCorporates coverage of 140+ national registries requires an API key not yet configured — coverage is currently limited to entities holding an LEI.)"}`,
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

    // ── Check 3: public registry lookup (OpenCorporates) ───────────────────
    const reg = companyName
      ? await checkRegistry(companyName)
      : { found: false, source: null as string | null, detail: "No company name on the profile." };
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

export type PublicVerificationData = {
  entity_type: "founder" | "investor";
  display_name: string;
  company_or_fund: string;
  current_tier: number;
  tier1_passed: boolean;
  tier1_score: number;
  tier1_checked_at: string | null;
  checks: {
    website_resolves: boolean | null;
    website_matches_pitch: boolean | null;
    linkedin_valid: boolean | null;
    email_domain_matches: boolean | null;
    registry_confirmed: boolean | null;
  };
  website_content_summary: string | null;
  tier2_passed: boolean;
  tier3_passed: boolean;
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

    if (data.entity_type === "founder") {
      // Look up startup by slug
      const startups: any[] = await supabaseQuery(sbUrl, sbKey,
        `startups?profile_slug=eq.${encodeURIComponent(data.slug)}&select=id,company_name,founder_name`,
        "GET"
      ).catch(() => []);
      const startup = startups?.[0];
      if (!startup) return null;

      const verif: any[] = await supabaseQuery(sbUrl, sbKey,
        `founder_verifications?startup_id=eq.${startup.id}&select=current_tier,tier1_passed,tier1_score,tier1_checked_at,website_resolves,website_matches_pitch,linkedin_valid,email_domain_matches,registry_confirmed,website_content_summary,tier2_passed,tier3_passed`,
        "GET"
      ).catch(() => []);
      const v = verif?.[0];

      return {
        entity_type: "founder",
        display_name: startup.founder_name || "Founder",
        company_or_fund: startup.company_name || "",
        current_tier: v?.current_tier ?? 0,
        tier1_passed: v?.tier1_passed ?? false,
        tier1_score: v?.tier1_score ?? 0,
        tier1_checked_at: v?.tier1_checked_at ?? null,
        checks: {
          website_resolves: v?.website_resolves ?? null,
          website_matches_pitch: v?.website_matches_pitch ?? null,
          linkedin_valid: v?.linkedin_valid ?? null,
          email_domain_matches: v?.email_domain_matches ?? null,
          registry_confirmed: v?.registry_confirmed ?? null,
        },
        website_content_summary: v?.website_content_summary ?? null,
        tier2_passed: v?.tier2_passed ?? false,
        tier3_passed: v?.tier3_passed ?? false,
      };
    }

    // Investor path (by slug = investor profile user_id or fund slug — use investor_profiles lookup)
    const investors: any[] = await supabaseQuery(sbUrl, sbKey,
      `investor_profiles?user_id=eq.${encodeURIComponent(data.slug)}&select=user_id,your_name,fund_name`,
      "GET"
    ).catch(() => []);
    const inv = investors?.[0];
    if (!inv) return null;

    const verif: any[] = await supabaseQuery(sbUrl, sbKey,
      `investor_verifications?investor_id=eq.${inv.user_id}&select=current_tier,tier1_passed,overall_score,checked_at,website_resolves,linkedin_valid,email_domain_matches,website_content_summary,tier2_passed,tier3_passed`,
      "GET"
    ).catch(() => []);
    const v = verif?.[0];

    return {
      entity_type: "investor",
      display_name: inv.your_name || "Investor",
      company_or_fund: inv.fund_name || "",
      current_tier: v?.current_tier ?? 0,
      tier1_passed: v?.tier1_passed ?? false,
      tier1_score: v?.overall_score ?? 0,
      tier1_checked_at: v?.checked_at ?? null,
      checks: {
        website_resolves: v?.website_resolves ?? null,
        website_matches_pitch: null,
        linkedin_valid: v?.linkedin_valid ?? null,
        email_domain_matches: v?.email_domain_matches ?? null,
        registry_confirmed: null,
      },
      website_content_summary: v?.website_content_summary ?? null,
      tier2_passed: v?.tier2_passed ?? false,
      tier3_passed: v?.tier3_passed ?? false,
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
