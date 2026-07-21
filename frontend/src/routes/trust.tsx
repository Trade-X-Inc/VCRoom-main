import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CheckCircle2, ChevronRight } from "lucide-react";

// ── Server fn — fetches real verification_tiers rows ─────────────────────────
const getVerificationTiers = createServerFn({ method: "GET" }).handler(async () => {
  const cfEnv = (globalThis as any).__cf_env || {};
  const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || "";
  const key = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return { tiers: [] };
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb.from("verification_tiers").select("id, tier_name, applies_to, description, requirements").order("id");
  return { tiers: data ?? [] };
});

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "How Verification Works — Hockystick" },
      { name: "description", content: "Every Hockystick verification tier explained. What each badge means, what we actually check, and what we never claim." },
    ],
  }),
  component: TrustPage,
});

// ── Tier display config ───────────────────────────────────────────────────────
const TIER_CONFIG: Record<number, { color: string; borderColor: string; badgeBg: string; badgeText: string }> = {
  0: { color: "var(--faint)",  borderColor: "var(--border)", badgeBg: "var(--border)",  badgeText: "var(--border)" },
  1: { color: "#3B82F6",                 borderColor: "rgba(59,130,246,0.2)",   badgeBg: "rgba(59,130,246,0.1)",   badgeText: "#3B82F6" },
  2: { color: "#10B981",                 borderColor: "rgba(16,185,129,0.2)",   badgeBg: "rgba(16,185,129,0.1)",   badgeText: "#10B981" },
  3: { color: "#F59E0B",                 borderColor: "rgba(245,158,11,0.2)",   badgeBg: "rgba(245,158,11,0.1)",   badgeText: "#F59E0B" },
  4: { color: "var(--brand)",                 borderColor: "rgba(124,58,237,0.2)",   badgeBg: "rgba(124,58,237,0.1)",   badgeText: "#A855F7" },
};

const APPLIES_TO_LABEL: Record<string, string> = {
  both: "Founders & Investors",
  founder: "Founders only",
  investor: "Investors only",
};

function TrustPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["verification-tiers"],
    queryFn: () => getVerificationTiers(),
    staleTime: 5 * 60 * 1000,
  });

  const tiers = data?.tiers ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="pt-16 sm:pt-24 pb-12 text-center px-4 sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "var(--brand)" }}>
          Verification system
        </p>
        <h1
          className="font-bold text-3xl md:text-4xl lg:text-5xl text-foreground leading-tight mb-6 max-w-3xl mx-auto"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          How verification works
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-6">
          Five tiers. Each badge means something specific and verifiable. This page shows exactly
          what we check and what we never claim.
        </p>

        {/* The principle — in a callout box, not buried */}
        <div
          className="inline-block max-w-xl mx-auto rounded-lg px-6 py-4 text-left"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          <p className="text-sm text-[#52525B] leading-relaxed">
            <span className="text-foreground font-medium">Every account is fully accepted from day one.</span>{" "}
            Badges show how much has been independently verified — they never gate access.
            You can use every feature on the platform regardless of your verification tier.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-8 px-4 sm:px-6 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="h-32 rounded-none animate-pulse" style={{ background: "var(--accent)" }} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {tiers.map((tier: any) => {
              const cfg = TIER_CONFIG[tier.id] ?? TIER_CONFIG[0];
              const requirements: Array<{ label: string; detail?: string }> = tier.requirements ?? [];
              const appliesToLabel = APPLIES_TO_LABEL[tier.applies_to] ?? tier.applies_to;

              return (
                <div
                  key={tier.id}
                  className="rounded-none p-6"
                  style={{ background: "var(--card)", border: `1px solid ${cfg.borderColor}` }}
                >
                  {/* Header row */}
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{ background: cfg.badgeBg, color: cfg.color, border: `1px solid ${cfg.borderColor}` }}
                    >
                      {tier.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
                          {tier.tier_name}
                        </h2>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}
                        >
                          {appliesToLabel}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
                    </div>
                  </div>

                  {/* Requirements */}
                  {requirements.length > 0 && (
                    <div className="space-y-2 ml-14">
                      {requirements.map((req, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: cfg.color }} />
                          <div className="min-w-0">
                            <span className="text-xs text-muted-foreground">{req.label}</span>
                            {req.detail && (
                              <p className="text-xs text-faint mt-0.5 leading-relaxed">{req.detail}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {requirements.length === 0 && (
                    <p className="text-xs text-faint ml-14 italic">No requirements — automatic on account creation.</p>
                  )}

                  {/* Inline notes for Tier 3 — dual paths: Capital Verified (investors) + Operationally Verified (founders) */}
                  {tier.id === 3 && (
                    <div className="ml-14 mt-3 space-y-3">
                      <div
                        className="rounded-lg px-4 py-3"
                        style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
                      >
                        <p className="text-xs text-[#52525B] font-medium mb-1.5">Capital Verified — for investors</p>
                        <p className="text-xs text-[#52525B] leading-relaxed">
                          Three independent documents: fund formation instrument, capital commitment letter or board resolution, AUM confirmation.
                          Accepted: Limited Partnership Agreement, Articles of Association, Board Resolution with capital commitment,
                          Bank statement or custodian letter (dated within 12 months).
                          Each slot requires distinct content — one document cannot satisfy more than one slot.
                        </p>
                      </div>
                      <div
                        className="rounded-lg px-4 py-3"
                        style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}
                      >
                        <p className="text-xs text-[#52525B] font-medium mb-1.5">Operationally Verified — for founders</p>
                        <p className="text-xs text-[#52525B] leading-relaxed">
                          Three independent documents: financial activity record, customer or contract evidence, team employment record.
                          Accepted: bank statements or revenue records (dated within 6 months), signed contracts or purchase orders naming an external party,
                          payroll records, employment contracts, offer letters, or org charts naming individuals with titles.
                          Each slot requires distinct content — one document cannot satisfy more than one slot.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Key guarantees */}
      <section className="py-8 px-4 sm:px-6 max-w-3xl mx-auto">
        <div
          className="rounded-none p-6"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: "Syne, sans-serif" }}>
            What we never do
          </h3>
          <div className="space-y-3">
            {[
              "Use one document to satisfy multiple unrelated claims. A pitch deck does not verify a financial statement. A financial document does not verify legal standing.",
              "Infer content from a filename or category label. A file named 'financials.csv' is only verified for a specific claim if the actual content confirms that claim.",
              "Gate platform access on verification tier. Every account has full access from sign-up.",
              "Let a verified badge drift from what was actually checked. The requirements on this page are the exact same requirements enforced by the system.",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs text-faint shrink-0 mt-0.5">○</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Links back to profiles */}
      <section className="py-8 px-4 sm:px-6 max-w-3xl mx-auto">
        <div className="flex flex-wrap gap-3">
          <Link
            to="/sign-up"
            search={{ role: "founder" } as any}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium text-foreground transition-colors"
            style={{ background: "var(--gradient-brand)" }}
          >
            Start as a founder
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/sign-up"
            search={{ role: "investor" } as any}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
          >
            Invest on Hockystick
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
