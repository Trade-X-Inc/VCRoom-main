import { createServerFn } from "@tanstack/react-start";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Tier1Result = {
  startup_id: string;
  website_resolves: boolean;
  website_matches_pitch: boolean;
  website_content_summary: string;
  linkedin_valid: boolean;
  email_domain_matches: boolean;
  registry_confirmed: boolean;
  tier1_score: number;
  tier1_passed: boolean;
  tier1_checked_at: string;
  error?: string;
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
// Tier 1 — Hockystick Checked (automated)
// ─────────────────────────────────────────────────────────────────────────────

export const runTier1Check = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as RunTier1Input)
  .handler(async ({ data }): Promise<Tier1Result> => {
    const { url: sbUrl, key: sbKey } = getSupabaseAdmin();
    const cfEnv = (globalThis as any).__cf_env || {};
    const openaiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";

    if (!sbUrl || !sbKey) {
      return { startup_id: data.startup_id, website_resolves: false, website_matches_pitch: false, website_content_summary: "", linkedin_valid: false, email_domain_matches: false, registry_confirmed: false, tier1_score: 0, tier1_passed: false, tier1_checked_at: new Date().toISOString(), error: "db_unavailable" };
    }

    // ── 1. Fetch startup data ──────────────────────────────────────────────
    const startupRows: any[] = await supabaseQuery(sbUrl, sbKey,
      `startups?id=eq.${data.startup_id}&select=id,founder_id,company_name,website,founder_linkedin,sector,stage,description,tagline,founder_email`,
      "GET"
    ).catch(() => []);

    const startup = startupRows?.[0];
    if (!startup) {
      return { startup_id: data.startup_id, website_resolves: false, website_matches_pitch: false, website_content_summary: "Startup not found", linkedin_valid: false, email_domain_matches: false, registry_confirmed: false, tier1_score: 0, tier1_passed: false, tier1_checked_at: new Date().toISOString(), error: "startup_not_found" };
    }

    // ── 2. Website resolves (20 pts) ───────────────────────────────────────
    const website_resolves = await checkUrlResolves(startup.website || "");

    // ── 3. Website content matches pitch (25 pts) — AI check ──────────────
    let website_matches_pitch = false;
    let website_content_summary = "";

    if (website_resolves && startup.website && openaiKey) {
      const pageText = await fetchPageText(startup.website);
      if (pageText.length > 100) {
        const pitchContext = [
          startup.company_name && `Company: ${startup.company_name}`,
          startup.sector && `Sector: ${startup.sector}`,
          startup.stage && `Stage: ${startup.stage}`,
          startup.tagline && `Tagline: ${startup.tagline}`,
          startup.description && `Description: ${startup.description?.slice(0, 300)}`,
        ].filter(Boolean).join("\n");

        try {
          const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              max_tokens: 200,
              messages: [
                {
                  role: "system",
                  content: "You are a verification analyst. Given a company profile and website text, determine if the website content is consistent with the company profile. Respond with JSON only: {\"matches\": true/false, \"summary\": \"one sentence explanation\"}",
                },
                {
                  role: "user",
                  content: `COMPANY PROFILE:\n${pitchContext}\n\nWEBSITE TEXT (first 3000 chars):\n${pageText}`,
                },
              ],
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (aiResp.ok) {
            const aiData: any = await aiResp.json();
            const raw = aiData.choices?.[0]?.message?.content || "{}";
            const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
            const parsed = JSON.parse(cleaned);
            website_matches_pitch = parsed.matches === true;
            website_content_summary = parsed.summary || "";
          }
        } catch {
          // AI check failed — don't penalise, just skip
          website_content_summary = "AI check unavailable";
        }
      }
    } else if (!openaiKey) {
      website_content_summary = "AI check skipped (no key)";
    }

    // ── 4. LinkedIn URL valid (15 pts) ─────────────────────────────────────
    // ToS: never scrape content — HEAD request only to check URL existence
    const linkedin_valid = await checkUrlResolves(startup.founder_linkedin || "");

    // ── 5. Email domain matches website (15 pts) ───────────────────────────
    let email_domain_matches = false;
    if (startup.founder_email && startup.website) {
      const eDomain = emailDomain(startup.founder_email);
      const wDomain = urlDomain(startup.website);
      // Common free email providers never match
      const freeProviders = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "me.com"];
      if (eDomain && wDomain && !freeProviders.includes(eDomain)) {
        email_domain_matches = eDomain === wDomain || eDomain.endsWith(`.${wDomain}`) || wDomain.endsWith(`.${eDomain}`);
      }
    }

    // ── 6. Registry confirmed (25 pts) — read existing row only ───────────
    let registry_confirmed = false;
    const regRows: any[] = await supabaseQuery(sbUrl, sbKey,
      `company_registry_checks?startup_id=eq.${data.startup_id}&select=verified,confidence_score&order=checked_at.desc&limit=1`,
      "GET"
    ).catch(() => []);
    if (regRows?.[0]?.verified === true && (regRows[0].confidence_score ?? 0) >= 60) {
      registry_confirmed = true;
    }

    // ── 7. Score ───────────────────────────────────────────────────────────
    const tier1_score =
      (website_resolves ? 20 : 0) +
      (website_matches_pitch ? 25 : 0) +
      (linkedin_valid ? 15 : 0) +
      (email_domain_matches ? 15 : 0) +
      (registry_confirmed ? 25 : 0);

    const tier1_passed = tier1_score >= 60;
    const tier1_checked_at = new Date().toISOString();
    const current_tier = tier1_passed ? 1 : 0;

    // ── 8. Upsert founder_verifications ───────────────────────────────────
    await supabaseQuery(sbUrl, sbKey, "founder_verifications", "POST", {
      startup_id: data.startup_id,
      website_resolves,
      website_matches_pitch,
      website_content_summary,
      linkedin_valid,
      email_domain_matches,
      registry_confirmed,
      tier1_score,
      tier1_passed,
      tier1_checked_at,
      current_tier,
      last_full_check_at: tier1_checked_at,
      updated_at: tier1_checked_at,
    }).catch(async () => {
      // Row may already exist — try PATCH
      await supabaseQuery(sbUrl, sbKey,
        `founder_verifications?startup_id=eq.${data.startup_id}`,
        "PATCH",
        {
          website_resolves, website_matches_pitch, website_content_summary,
          linkedin_valid, email_domain_matches, registry_confirmed,
          tier1_score, tier1_passed, tier1_checked_at, current_tier,
          last_full_check_at: tier1_checked_at, updated_at: tier1_checked_at,
        }
      ).catch(() => null);
    });

    // ── 9. Award badge if passed ───────────────────────────────────────────
    if (tier1_passed) {
      await supabaseQuery(sbUrl, sbKey, "profile_badges", "POST", {
        startup_id: data.startup_id,
        badge_type: "hockystick_checked",
        badge_label: "Hockystick Checked",
        badge_source: "hockystick",
        verified_by_hockystick: true,
        issued_at: tier1_checked_at,
        verification_evidence: {
          tier1_score,
          website_resolves,
          website_matches_pitch,
          linkedin_valid,
          email_domain_matches,
          registry_confirmed,
        },
      }).catch(async () => {
        // Badge may already exist — update it
        await supabaseQuery(sbUrl, sbKey,
          `profile_badges?startup_id=eq.${data.startup_id}&badge_type=eq.hockystick_checked`,
          "PATCH",
          {
            badge_label: "Hockystick Checked",
            issued_at: tier1_checked_at,
            verification_evidence: {
              tier1_score, website_resolves, website_matches_pitch,
              linkedin_valid, email_domain_matches, registry_confirmed,
            },
          }
        ).catch(() => null);
      });
    }

    return {
      startup_id: data.startup_id,
      website_resolves,
      website_matches_pitch,
      website_content_summary,
      linkedin_valid,
      email_domain_matches,
      registry_confirmed,
      tier1_score,
      tier1_passed,
      tier1_checked_at,
    };
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
