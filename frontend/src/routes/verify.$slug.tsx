import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Clock, ArrowLeft, ShieldCheck, Shield, User } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import type { PublicVerificationData, PublicCheckLine } from "@/lib/verification-fn";

export const Route = createFileRoute("/verify/$slug")({
  head: ({ loaderData }) => {
    const d = loaderData as unknown as PublicVerificationData | null;
    if (!d) return { meta: [{ title: "Verification report — Hockystick" }] };
    return {
      meta: [
        { title: `${d.company_or_fund} — Verification report — Hockystick` },
        { name: "description", content: `What Hockystick specifically confirmed about ${d.company_or_fund}, with timestamps.` },
      ],
    };
  },
  loader: async ({ params }) => {
    if (!params.slug) return null;
    const { getPublicVerification } = await import("@/lib/verification-fn");
    return getPublicVerification({ data: { slug: params.slug, entity_type: "founder" } });
  },
  component: VerifyPage,
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function fmtDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
    }) + " UTC";
  } catch {
    return dateStr;
  }
}

function StatusPill({ state }: { state: "pass" | "fail" | "pending" }) {
  if (state === "pass") return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}>
      <CheckCircle2 className="h-3 w-3" /> Confirmed
    </span>
  );
  if (state === "fail") return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
      <XCircle className="h-3 w-3" /> Not confirmed
    </span>
  );
  return (
    <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
      Not checked
    </span>
  );
}

function FactLine({ check }: { check: PublicCheckLine }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/80">{check.label}</div>
        {check.detail && <div className="text-xs text-white/35 mt-0.5 leading-relaxed">{check.detail}</div>}
      </div>
      <StatusPill state={check.passed === null ? "pending" : check.passed ? "pass" : "fail"} />
    </div>
  );
}

function TierHeader({ title, met, checkedAt, notCompletedLabel }: { title: string; met: boolean; checkedAt?: string | null; notCompletedLabel?: string }) {
  return (
    <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ShieldCheck size={16} style={{ color: met ? "#10B981" : "rgba(255,255,255,0.2)" }} />
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 13, color: met ? "#fff" : "rgba(255,255,255,0.4)" }}>
          {title}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {checkedAt && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={10} /> {fmt(checkedAt)}
          </span>
        )}
        <span style={{ fontSize: 11, color: met ? "#10B981" : "rgba(255,255,255,0.25)" }}>
          {met ? "Passed" : (notCompletedLabel ?? "Not completed")}
        </span>
      </div>
    </div>
  );
}

const TIER_BADGE: Record<number, { label: string; bg: string; color: string; border: string }> = {
  0: { label: "Not verified", bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.1)" },
  1: { label: "✓ Identity Confirmed", bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.65)", border: "rgba(255,255,255,0.12)" },
  2: { label: "✓ Claims Verified", bg: "rgba(16,185,129,0.12)", color: "#10B981", border: "rgba(16,185,129,0.2)" },
  3: { label: "✓ Operationally Verified", bg: "rgba(59,130,246,0.12)", color: "#3B82F6", border: "rgba(59,130,246,0.2)" },
  4: { label: "✦ Hockystick Verified", bg: "rgba(124,58,237,0.12)", color: "#A855F7", border: "rgba(124,58,237,0.2)" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

function VerifyPage() {
  const data = Route.useLoaderData() as PublicVerificationData | null;

  if (!data) {
    return (
      <div style={{ background: "#0A0A0B", minHeight: "100vh" }}>
        <SiteHeader />
        <main style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <Shield size={40} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 24px" }} />
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 24, color: "#fff", marginBottom: 12 }}>
            Verification report not found
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 32 }}>
            This profile may not exist, may not be published, or has no verification data yet.
          </p>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#7C3AED", fontSize: 14, textDecoration: "none" }}>
            <ArrowLeft size={14} /> Back to Hockystick
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const badge = TIER_BADGE[data.current_tier] ?? TIER_BADGE[0];

  return (
    <div style={{ background: "#0A0A0B", minHeight: "100vh" }}>
      <SiteHeader />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "64px 24px 96px" }}>

        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)", fontSize: 13, textDecoration: "none", marginBottom: 40 }}>
          <ArrowLeft size={13} /> Back to Hockystick
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 12 }}>
            Verification report
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 28, color: "#fff", margin: 0 }}>
                {data.company_or_fund}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 4 }}>
                Startup · {data.display_name}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
              {badge.label}
            </span>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 32 }}>
          Generated {fmtDateTime(data.generated_at)}
        </p>

        {/* Scope statement */}
        <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 10, padding: "14px 18px", marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>
            Every line below is a specific fact Hockystick checked, with the date it was checked.
            Nothing on this page is self-reported: a claim appears as confirmed only when a document
            was reviewed and found to support it. Badges reflect only what was genuinely verified.
          </p>
        </div>

        {/* Tier 1 — Identity Confirmed */}
        <div style={{ background: "#111114", border: `1px solid ${data.tier1.passed ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
          <TierHeader title="Tier 1 — Identity Confirmed" met={data.tier1.passed} checkedAt={data.tier1.checked_at} notCompletedLabel={data.tier1.checked_at ? "Did not pass" : "Not run"} />
          <div style={{ padding: "0 20px" }}>
            {data.tier1.checks.map((c) => <FactLine key={c.label} check={c} />)}
          </div>
          {data.tier1.registry_source && (
            <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              Registry source: {data.tier1.registry_source}
            </div>
          )}
        </div>

        {/* Tier 2 — Claims Verified */}
        <div style={{ background: "#111114", border: `1px solid ${data.tier2.met ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
          <TierHeader title="Tier 2 — Claims Verified" met={data.tier2.met} checkedAt={data.tier2.last_checked_at} />
          {data.tier2.verified_claims.length > 0 ? (
            <div style={{ padding: "0 20px" }}>
              {data.tier2.verified_claims.map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-4 py-3.5 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80">“{c.text}”</div>
                    <div className="text-xs text-white/35 mt-0.5">
                      {c.category ? `${c.category.charAt(0).toUpperCase()}${c.category.slice(1)} claim` : "Claim"} · document reviewed {fmt(c.checked_at)}
                    </div>
                  </div>
                  <StatusPill state="pass" />
                </div>
              ))}
              {data.tier2.total_claims > data.tier2.verified_claims.length && (
                <div style={{ padding: "10px 0 14px", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {data.tier2.total_claims} claim{data.tier2.total_claims === 1 ? "" : "s"} checked in total; only claims whose evidence was confirmed are listed.
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "14px 20px", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              No verified claims. Requires at least 3 claims each backed by a document the AI confirmed, including at least 1 financial claim.
            </div>
          )}
        </div>

        {/* Tier 3 — Operationally Verified */}
        <div style={{ background: "#111114", border: `1px solid ${data.tier3.met ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
          <TierHeader title="Tier 3 — Operationally Verified" met={data.tier3.met} checkedAt={data.tier3.human_reviewed_at} />
          <div style={{ padding: "0 20px" }}>
            {data.tier3.docs.map((d) => (
              <div key={d.label} className="flex items-start justify-between gap-4 py-3.5 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80">{d.label}</div>
                  {d.uploaded_at && <div className="text-xs text-white/35 mt-0.5">Submitted {fmt(d.uploaded_at)}</div>}
                </div>
                <StatusPill state={d.verified ? "pass" : d.uploaded_at ? "fail" : "pending"} />
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: data.tier3.human_reviewed ? "#3B82F6" : "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 6 }}>
            <User size={12} />
            {data.tier3.human_reviewed
              ? `Human reviewed ${fmt(data.tier3.human_reviewed_at)}`
              : "Human review pending — Tier 3 is never awarded by AI alone."}
          </div>
        </div>

        {/* Tier 4 — Hockystick Verified */}
        <div style={{ background: "#111114", border: `1px solid ${data.tier4.signed_off ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, marginBottom: 40, overflow: "hidden" }}>
          <TierHeader title="Tier 4 — Hockystick Verified" met={data.tier4.signed_off} checkedAt={data.tier4.reviewed_at} />
          <div style={{ padding: "14px 20px", fontSize: 12, color: data.tier4.signed_off ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
            {data.tier4.signed_off ? (
              <>
                Live video review completed. Identity matched against submitted documents.
                {data.tier4.reviewer_name && <> Reviewed by <span style={{ color: "#A855F7" }}>{data.tier4.reviewer_name}</span>, {fmt(data.tier4.reviewed_at)}.</>}
              </>
            ) : (
              "Requires all prior tiers plus a live video review with a named Hockystick reviewer."
            )}
          </div>
        </div>

        {/* Footer note */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1.7, marginBottom: 16 }}>
            This report is generated by Hockystick for transparency. It is not a financial reference
            or legal certification. Checks carry the date they were run and can be re-run at any time.
            If you believe a result is incorrect, contact <a href="mailto:support@hockystick.app" style={{ color: "rgba(124,58,237,0.7)" }}>support@hockystick.app</a>.
          </p>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
            <ArrowLeft size={11} /> hockystick.app
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
