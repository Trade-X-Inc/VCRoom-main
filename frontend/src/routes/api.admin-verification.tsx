import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Hockystick team only — key-gated (ADMIN_SECRET_KEY) verification review.
// Tier 3 is never awarded by AI alone: this page is where the human review
// happens. Tier 4 sign-off (named reviewer) also lives here.
// ─────────────────────────────────────────────────────────────────────────────

type PendingReview = {
  startup_id: string;
  company_name: string;
  founder_email: string | null;
  current_tier: number;
  tier2_passed: boolean;
  tier3_passed: boolean;
  tier4_passed: boolean;
  verified_claims: number;
  slots: {
    slot: string;
    label: string;
    verified: boolean;
    uploaded_at: string | null;
    ai: { confirmed?: boolean; confidence?: string; explanation?: string; issues?: string } | null;
  }[];
  review_requested_at: string | null;
};

function adminEnv() {
  const cfEnv = (globalThis as any).__cf_env || {};
  return {
    expectedKey: cfEnv.ADMIN_SECRET_KEY || "",
    url: cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || "",
    serviceKey: cfEnv.SUPABASE_SERVICE_ROLE_KEY || "",
    resendKey: cfEnv.RESEND_API_KEY || "",
    fromEmail: cfEnv.RESEND_FROM_EMAIL || "hello@hockystick.app",
  };
}

async function sbFetch(url: string, key: string, path: string, method = "GET", body?: unknown) {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: method === "GET" ? "" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`${method} ${path} ${resp.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const fetchPendingReviews = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => d as { key?: string })
  .handler(async ({ data }): Promise<{ error?: string; reviews?: PendingReview[] }> => {
    const { expectedKey, url, serviceKey } = adminEnv();
    if (!expectedKey || data.key !== expectedKey) return { error: "unauthorized" };
    if (!url || !serviceKey) return { error: "service_unavailable" };

    // Candidates: any startup with at least one operational doc submitted or review requested
    const rows: any[] = await sbFetch(url, serviceKey,
      `founder_verifications?select=startup_id,current_tier,tier2_passed,tier3_passed,tier4_passed,human_verified_at,operational_human_review_requested_at,` +
      `operational_bank_verified,operational_bank_doc_uploaded_at,operational_bank_ai_extracted,` +
      `operational_contract_verified,operational_contract_doc_uploaded_at,operational_contract_ai_extracted,` +
      `operational_team_verified,operational_team_doc_uploaded_at,operational_team_ai_extracted` +
      `&or=(operational_bank_doc_uploaded_at.not.is.null,operational_contract_doc_uploaded_at.not.is.null,operational_team_doc_uploaded_at.not.is.null,operational_human_review_requested_at.not.is.null)`
    ).catch(() => []);

    if (!rows.length) return { reviews: [] };

    const ids = rows.map((r) => r.startup_id).join(",");
    const [startups, claims]: [any[], any[]] = await Promise.all([
      sbFetch(url, serviceKey, `startups?id=in.(${ids})&select=id,company_name,founder_email`).catch(() => []),
      sbFetch(url, serviceKey, `startup_claims?startup_id=in.(${ids})&ai_verdict=eq.verified&select=startup_id`).catch(() => []),
    ]);
    const byId = new Map(startups.map((s) => [s.id, s]));
    const verifiedCount = new Map<string, number>();
    for (const c of claims) verifiedCount.set(c.startup_id, (verifiedCount.get(c.startup_id) ?? 0) + 1);

    const reviews: PendingReview[] = rows.map((r) => ({
      startup_id: r.startup_id,
      company_name: byId.get(r.startup_id)?.company_name ?? r.startup_id,
      founder_email: byId.get(r.startup_id)?.founder_email ?? null,
      current_tier: r.current_tier ?? 0,
      tier2_passed: r.tier2_passed ?? false,
      tier3_passed: r.tier3_passed ?? false,
      tier4_passed: r.tier4_passed ?? false,
      verified_claims: verifiedCount.get(r.startup_id) ?? 0,
      review_requested_at: r.operational_human_review_requested_at ?? null,
      slots: [
        { slot: "operational_bank", label: "Financial activity", verified: r.operational_bank_verified ?? false, uploaded_at: r.operational_bank_doc_uploaded_at, ai: r.operational_bank_ai_extracted },
        { slot: "operational_contract", label: "Customer / contract", verified: r.operational_contract_verified ?? false, uploaded_at: r.operational_contract_doc_uploaded_at, ai: r.operational_contract_ai_extracted },
        { slot: "operational_team", label: "Team evidence", verified: r.operational_team_verified ?? false, uploaded_at: r.operational_team_doc_uploaded_at, ai: r.operational_team_ai_extracted },
      ],
    }));

    return { reviews };
  });

const approveTier3 = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { key: string; startup_id: string; notes?: string })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { expectedKey, url, serviceKey, resendKey, fromEmail } = adminEnv();
    if (!expectedKey || data.key !== expectedKey) return { ok: false, error: "unauthorized" };

    const now = new Date().toISOString();
    await sbFetch(url, serviceKey, `founder_verifications?startup_id=eq.${data.startup_id}`, "PATCH", {
      tier3_passed: true,
      human_verified_at: now,
      human_review_notes: data.notes ?? "Approved after manual spot-check",
      updated_at: now,
    });

    const { recomputeVerificationTier } = await import("@/lib/tier-calc");
    await recomputeVerificationTier(url, serviceKey, data.startup_id).catch(() => null);
    const { evaluateAndAwardBadgesCore } = await import("@/lib/badge-award-engine");
    await evaluateAndAwardBadgesCore({ startupId: data.startup_id });

    // Notify the founder
    const startups: any[] = await sbFetch(url, serviceKey,
      `startups?id=eq.${data.startup_id}&select=company_name,founder_email`).catch(() => []);
    const s = startups?.[0];
    if (resendKey && s?.founder_email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: `Hockystick <${fromEmail}>`,
          to: [s.founder_email],
          subject: "Operationally Verified — your Tier 3 badge is live",
          html: `<p>Your operational evidence for <strong>${s.company_name}</strong> passed human review. The Operationally Verified badge now shows on your profile and public verification report.</p>`,
          tags: [{ name: "type", value: "tier3_approved" }],
        }),
      }).catch(() => null);
    }
    return { ok: true };
  });

const approveTier4 = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { key: string; startup_id: string; reviewer_name: string })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { expectedKey, url, serviceKey } = adminEnv();
    if (!expectedKey || data.key !== expectedKey) return { ok: false, error: "unauthorized" };
    if (!data.reviewer_name?.trim()) return { ok: false, error: "Reviewer name is required — Tier 4 is signed by a named person." };

    const now = new Date().toISOString();
    await sbFetch(url, serviceKey, `founder_verifications?startup_id=eq.${data.startup_id}`, "PATCH", {
      tier4_passed: true,
      tier4_reviewer_name: data.reviewer_name.trim(),
      tier4_reviewed_at: now,
      updated_at: now,
    });
    const { recomputeVerificationTier } = await import("@/lib/tier-calc");
    await recomputeVerificationTier(url, serviceKey, data.startup_id).catch(() => null);
    const { evaluateAndAwardBadgesCore } = await import("@/lib/badge-award-engine");
    await evaluateAndAwardBadgesCore({ startupId: data.startup_id });
    return { ok: true };
  });

const requestMoreEvidence = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { key: string; startup_id: string; message: string })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { expectedKey, url, serviceKey, resendKey, fromEmail } = adminEnv();
    if (!expectedKey || data.key !== expectedKey) return { ok: false, error: "unauthorized" };
    if (!resendKey) return { ok: false, error: "email_unavailable" };

    const startups: any[] = await sbFetch(url, serviceKey,
      `startups?id=eq.${data.startup_id}&select=company_name,founder_email`).catch(() => []);
    const s = startups?.[0];
    if (!s?.founder_email) return { ok: false, error: "no_founder_email" };

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `Hockystick <${fromEmail}>`,
        to: [s.founder_email],
        subject: `More evidence needed for ${s.company_name} verification`,
        html: `<p>Our review of your Tier 3 verification needs more evidence:</p><blockquote>${(data.message || "Please re-submit clearer documents.").replace(/</g, "&lt;")}</blockquote><p>Upload replacements from your profile's verification section, and we'll take another look.</p>`,
        tags: [{ name: "type", value: "tier3_more_evidence" }],
      }),
    });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/admin-verification")({
  validateSearch: (s: Record<string, unknown>) => ({ key: String(s.key ?? "") }),
  loaderDeps: ({ search }) => ({ key: search.key }),
  loader: ({ deps }) => fetchPendingReviews({ data: { key: deps.key } }),
  component: AdminVerificationPage,
});

const box: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, marginBottom: 14 };
const btn: React.CSSProperties = { border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#fff" };

function AdminVerificationPage() {
  const data = Route.useLoaderData() as { error?: string; reviews?: PendingReview[] };
  const { key } = Route.useSearch();
  const [status, setStatus] = useState<string>("");
  const [reviewer, setReviewer] = useState<string>("");

  if (data.error) {
    return <pre style={{ padding: 24, fontFamily: "monospace", color: "#ef4444", background: "#0a0a0b", minHeight: "100vh" }}>{data.error} — pass ?key=ADMIN_SECRET_KEY</pre>;
  }

  const reviews = data.reviews ?? [];
  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>, label: string) => {
    setStatus(`${label}…`);
    try {
      const r = await fn();
      setStatus(r.ok ? `${label}: done. Reload to refresh.` : `${label}: ${r.error}`);
    } catch (e: any) {
      setStatus(`${label}: ${e?.message ?? "failed"}`);
    }
  };

  return (
    <div style={{ background: "#0a0a0b", minHeight: "100vh", padding: 24, fontFamily: "system-ui", color: "#fff" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Verification review queue</h1>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 8 }}>
        Tier 3 approval requires your manual spot-check of the three documents below — the AI verdicts are the first pass, you are the second.
      </p>
      <div style={{ marginBottom: 18 }}>
        <input
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          placeholder="Your name (required for Tier 4 sign-off)"
          style={{ background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 7, padding: "7px 12px", fontSize: 12, color: "var(--foreground)", width: 300 }}
        />
      </div>
      {status && <div style={{ marginBottom: 14, fontSize: 12, color: "#F59E0B" }}>{status}</div>}
      {reviews.length === 0 && <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No startups awaiting review.</div>}

      {reviews.map((r) => (
        <div key={r.startup_id} style={box}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{r.company_name}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                Tier {r.current_tier} · {r.verified_claims} verified claims · {r.founder_email ?? "no email"}
                {r.review_requested_at && <> · review requested {new Date(r.review_requested_at).toLocaleDateString()}</>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!r.tier3_passed && (
                <>
                  <button
                    style={{ ...btn, background: "#10B981" }}
                    onClick={() => act(() => approveTier3({ data: { key, startup_id: r.startup_id, notes: `Approved by ${reviewer || "admin"}` } }), `Approve Tier 3 (${r.company_name})`)}
                  >
                    Approve Tier 3
                  </button>
                  <button
                    style={{ ...btn, background: "rgba(245,158,11,0.9)" }}
                    onClick={() => {
                      const message = window.prompt("What additional evidence is needed?");
                      if (message) act(() => requestMoreEvidence({ data: { key, startup_id: r.startup_id, message } }), `Request evidence (${r.company_name})`);
                    }}
                  >
                    Request more evidence
                  </button>
                </>
              )}
              {r.tier3_passed && !r.tier4_passed && (
                <button
                  style={{ ...btn, background: "var(--gradient-brand)" }}
                  onClick={() => act(() => approveTier4({ data: { key, startup_id: r.startup_id, reviewer_name: reviewer } }), `Sign off Tier 4 (${r.company_name})`)}
                >
                  Sign off Tier 4 (video review done)
                </button>
              )}
              {r.tier3_passed && r.tier4_passed && <span style={{ fontSize: 12, color: "#A855F7", alignSelf: "center" }}>✦ Fully verified</span>}
            </div>
          </div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {r.slots.map((s) => (
              <div key={s.slot} style={{ background: "var(--accent)", borderRadius: 8, padding: 12, border: `1px solid ${s.verified ? "rgba(16,185,129,0.3)" : "var(--border)"}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  {s.label} — <span style={{ color: s.verified ? "#10B981" : s.uploaded_at ? "#EF4444" : "var(--faint)" }}>
                    {s.verified ? "AI confirmed" : s.uploaded_at ? "AI rejected" : "not submitted"}
                  </span>
                </div>
                {s.uploaded_at && <div style={{ fontSize: 10, color: "var(--faint)", marginBottom: 4 }}>Uploaded {new Date(s.uploaded_at).toLocaleDateString()}</div>}
                {s.ai?.explanation && <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{s.ai.explanation}</div>}
                {s.ai?.issues && <div style={{ fontSize: 11, color: "#F59E0B", lineHeight: 1.5, marginTop: 3 }}>Issues: {s.ai.issues}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
