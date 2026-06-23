import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Clock, ArrowLeft, ShieldCheck, Shield } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import type { PublicVerificationData } from "@/lib/verification-fn";

export const Route = createFileRoute("/verify/$slug")({
  head: ({ loaderData }) => {
    const d = loaderData as PublicVerificationData | null;
    if (!d) return { meta: [{ title: "Verification report — Hockystick" }] };
    return {
      meta: [
        { title: `${d.company_or_fund} — Verification report — Hockystick` },
        { name: "description", content: `Independent verification report for ${d.company_or_fund} on Hockystick.` },
      ],
    };
  },
  loader: async ({ params }) => {
    if (!params.slug) return null;
    const { getPublicVerification } = await import("@/lib/verification-fn");
    // Try founder first, then investor
    const founder = await getPublicVerification({ data: { slug: params.slug, entity_type: "founder" } });
    return founder;
  },
  component: VerifyPage,
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function CheckLine({ label, pts, passed, note }: { label: string; pts: number; passed: boolean | null; note?: string }) {
  return (
    <div
      className="flex items-start justify-between gap-4 py-3.5 border-b last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/80">{label}</div>
        {note && <div className="text-xs text-white/35 mt-0.5 leading-relaxed">{note}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-white/30">{pts} pts</span>
        {passed === null ? (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>Not checked</span>
        ) : passed ? (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}>
            <CheckCircle2 className="h-3 w-3" /> Pass
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
            <XCircle className="h-3 w-3" /> Fail
          </span>
        )}
      </div>
    </div>
  );
}

function TierPill({ tier }: { tier: number }) {
  if (tier === 0) return (
    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
      Not verified
    </span>
  );
  if (tier === 1) return (
    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}>
      ✓ Hockystick Checked
    </span>
  );
  if (tier === 2) return (
    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
      ✓ Document Verified
    </span>
  );
  return (
    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(124,58,237,0.12)", color: "#A855F7", border: "1px solid rgba(124,58,237,0.2)" }}>
      ✦ Hockystick Verified
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

function VerifyPage() {
  const data = Route.useLoaderData() as PublicVerificationData | null;

  if (!data) {
    return (
      <div style={{ background: "#0A0A0B", minHeight: "100vh" }}>
        <SiteHeader />
        <main
          style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}
        >
          <Shield size={40} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 24px" }} />
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 24, color: "#fff", marginBottom: 12 }}>
            Verification report not found
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 32 }}>
            This profile may not exist, may not be published, or has no verification data yet.
          </p>
          <Link
            to="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#7C3AED", fontSize: 14, textDecoration: "none" }}
          >
            <ArrowLeft size={14} /> Back to Hockystick
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const scoreColor = data.tier1_score >= 80 ? "#10B981" : data.tier1_score >= 60 ? "rgba(255,255,255,0.6)" : "#F59E0B";

  return (
    <div style={{ background: "#0A0A0B", minHeight: "100vh" }}>
      <SiteHeader />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "64px 24px 96px" }}>

        {/* Back link */}
        <Link
          to="/"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)", fontSize: 13, textDecoration: "none", marginBottom: 40 }}
        >
          <ArrowLeft size={13} /> Back to Hockystick
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 12 }}>
            Verification report
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 28, color: "#fff", margin: 0 }}>
                {data.company_or_fund}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 4 }}>
                {data.entity_type === "founder" ? "Startup" : "Investor"} · {data.display_name}
              </p>
            </div>
            <TierPill tier={data.current_tier} />
          </div>
        </div>

        {/* What this report confirms */}
        <div
          style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 10, padding: "14px 18px", marginBottom: 32 }}
        >
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>
            This report was generated automatically by Hockystick. It confirms only the specific checks listed below — it does not verify revenue claims, fund size, portfolio returns, or investment history.
            The badge shown reflects only what was genuinely verified.
          </p>
        </div>

        {/* Tier 1 checks */}
        <div
          style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}
        >
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShieldCheck size={16} style={{ color: data.tier1_passed ? "#10B981" : "rgba(255,255,255,0.2)" }} />
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 13, color: "#fff" }}>
                Tier 1 — Automated checks
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {data.tier1_checked_at && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={10} /> {fmt(data.tier1_checked_at)}
                </span>
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor, fontFamily: "Syne, sans-serif" }}>
                {data.tier1_score}/100
              </span>
            </div>
          </div>
          <div style={{ padding: "0 20px" }}>
            <CheckLine
              label="Website resolves"
              pts={20}
              passed={data.checks.website_resolves}
              note="A valid HTTP/HTTPS response was received from the listed website."
            />
            {data.entity_type === "founder" && (
              <CheckLine
                label="Website content matches profile"
                pts={25}
                passed={data.checks.website_matches_pitch}
                note={data.website_content_summary ?? "AI compared the website's public content against the registered company profile."}
              />
            )}
            <CheckLine
              label="LinkedIn URL reachable"
              pts={15}
              passed={data.checks.linkedin_valid}
              note="The LinkedIn URL provided returns a valid response. Content is not scraped."
            />
            <CheckLine
              label="Email domain matches website"
              pts={15}
              passed={data.checks.email_domain_matches}
              note="The contact email domain matches the registered website domain. Free email providers (Gmail, Yahoo etc.) are excluded."
            />
            {data.entity_type === "founder" && (
              <CheckLine
                label="Company registry confirmed"
                pts={25}
                passed={data.checks.registry_confirmed}
                note="A company registration record matching this profile was found in a public registry (OpenCorporates, Companies House, DIFC, or ADGM)."
              />
            )}
          </div>
        </div>

        {/* Tier 2 */}
        <div
          style={{ background: "#111114", border: `1px solid ${data.tier2_passed ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, marginBottom: 16 }}
        >
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={16} style={{ color: data.tier2_passed ? "#10B981" : "rgba(255,255,255,0.15)" }} />
            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 13, color: data.tier2_passed ? "#fff" : "rgba(255,255,255,0.3)" }}>
              Tier 2 — Document verified
            </span>
            {data.tier2_passed && (
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#10B981" }}>Passed</span>
            )}
            {!data.tier2_passed && (
              <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Not completed</span>
            )}
          </div>
          {data.tier2_passed && (
            <div style={{ padding: "0 20px 16px", fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              A business registration or trade license document was submitted and cross-checked by AI against the company profile.
              The raw document number is not displayed.
            </div>
          )}
        </div>

        {/* Tier 3 */}
        <div
          style={{ background: "#111114", border: `1px solid ${data.tier3_passed ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, marginBottom: 40 }}
        >
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={16} style={{ color: data.tier3_passed ? "#A855F7" : "rgba(255,255,255,0.15)" }} />
            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 13, color: data.tier3_passed ? "#fff" : "rgba(255,255,255,0.3)" }}>
              Tier 3 — Hockystick Verified (human review)
            </span>
            {data.tier3_passed && (
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#A855F7" }}>Verified</span>
            )}
            {!data.tier3_passed && (
              <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Not completed</span>
            )}
          </div>
          {data.tier3_passed && (
            <div style={{ padding: "0 20px 16px", fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              Identity and registration were manually reviewed and confirmed by a member of the Hockystick team.
            </div>
          )}
        </div>

        {/* Footer note */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1.7, marginBottom: 16 }}>
            This report is generated by Hockystick and is provided for transparency only.
            It is not a financial reference or legal certification. Checks are re-run periodically.
            If you believe a result is incorrect, contact <a href="mailto:support@hockystick.app" style={{ color: "rgba(124,58,237,0.7)" }}>support@hockystick.app</a>.
          </p>
          <Link
            to="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}
          >
            <ArrowLeft size={11} /> hockystick.app
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
