import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust & Verification — Hockystick" },
      {
        name: "description",
        content:
          "How Hockystick verifies founders and investors. Two-way trust infrastructure for MENA fundraising.",
      },
    ],
  }),
  component: TrustPage,
});

// ── BadgeCard ─────────────────────────────────────────────────────

interface BadgeCardProps {
  icon: string;
  iconColor: string;
  badgeClass?: string;
  name: string;
  tagline: string;
  how: string;
  checks: string[];
  notClaimed: string[];
  status: "automatic" | "coming_soon";
  availableText?: string;
}

function BadgeCard({
  icon,
  iconColor,
  badgeClass,
  name,
  tagline,
  how,
  checks,
  notClaimed,
  status,
  availableText,
}: BadgeCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 mb-4 ${
        status === "coming_soon"
          ? "border-white/5 bg-white/[0.02] opacity-70"
          : "border-white/8 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className={`text-lg leading-none mt-0.5 shrink-0 ${iconColor}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              {name}
            </p>
            {status === "coming_soon" && (
              <span className="text-xs bg-white/8 text-white/40 px-2 py-0.5 rounded-full border border-white/10">
                {availableText ?? "Coming soon"}
              </span>
            )}
            {status === "automatic" && badgeClass && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeClass}`}>
                {icon} {name}
              </span>
            )}
          </div>
          <p className="text-xs text-white/40">{tagline}</p>
        </div>
      </div>

      <p className="text-xs text-white/50 mb-3 leading-relaxed">
        <span className="text-white/30">How: </span>
        {how}
      </p>

      {checks.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-green-400 shrink-0">✓</span>
              <span className="text-white/60">{check}</span>
            </div>
          ))}
        </div>
      )}

      {notClaimed.length > 0 && (
        <div className="border-t border-white/5 pt-3 space-y-1.5">
          <p className="text-xs text-white/25 mb-1.5">What this badge does NOT claim:</p>
          {notClaimed.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-white/20 shrink-0">○</span>
              <span className="text-white/30">{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

function TrustPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <SiteHeader />

      {/* Hero */}
      <section className="pt-12 sm:pt-24 pb-12 sm:pb-16 text-center px-4 sm:px-6">
        <p className="text-xs text-[#7C3AED] uppercase tracking-[0.2em] mb-4">
          Trust Infrastructure
        </p>
        <h1
          className="font-bold text-3xl md:text-4xl lg:text-5xl text-white leading-tight mb-6 max-w-3xl mx-auto"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Two-way verified trust.<br />
          Not just founder checks.
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
          Every platform verifies founders. None verify investors.
          Hockystick is the first to build trust infrastructure for both sides of the table — so
          deals are based on merit, not connections.
        </p>
      </section>

      {/* Badge columns */}
      <section className="py-8 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* FOUNDER BADGES */}
          <div>
            <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-6">For Founders</p>

            <BadgeCard
              icon="○"
              iconColor="text-white/40"
              name="Profile Active"
              tagline="Your profile is live on Hockystick"
              how="Automatic when you publish your founder profile with 80%+ completeness."
              checks={[
                "Company details complete",
                "Problem & solution filled",
                "Funding target set",
                "Profile published",
              ]}
              notClaimed={[]}
              status="automatic"
            />

            <BadgeCard
              icon="✓"
              iconColor="text-blue-400"
              badgeClass="bg-blue-500/15 text-blue-400 border-blue-500/20"
              name="Hockystick Reviewed"
              tagline="Your documents have been AI-reviewed"
              how="Automatic when you complete 3+ documents in the Document Intelligence Centre with AI review scores."
              checks={[
                "Pitch deck uploaded or profile complete",
                "At least 3 key documents completed",
                "AI document review run",
                "No critical gaps flagged",
              ]}
              notClaimed={[
                "Does not verify revenue figures",
                "Does not verify customer claims",
                "Does not verify team backgrounds",
              ]}
              status="automatic"
            />

            <BadgeCard
              icon="✦"
              iconColor="text-[#7C3AED]"
              badgeClass="bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/20"
              name="Hockystick Verified"
              tagline="Identity and business independently confirmed"
              how="Manual review by the Hockystick team. Includes identity confirmation, company registration check, and structured challenge session with verified investors."
              checks={[
                "Government-issued ID verified",
                "Company registration confirmed",
                "Business model challenged by investors",
                "Key claims independently checked",
              ]}
              notClaimed={[]}
              status="coming_soon"
              availableText="Available Q3 2026"
            />
          </div>

          {/* INVESTOR BADGES */}
          <div>
            <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-6">For Investors</p>

            <BadgeCard
              icon="○"
              iconColor="text-white/40"
              name="Thesis Active"
              tagline="Your investment thesis is on the platform"
              how="Automatic when your investor profile is complete with sectors, stages, and geography."
              checks={[
                "Investment thesis filled",
                "Sectors and stages defined",
                "Geography preference set",
                "Check size range provided",
              ]}
              notClaimed={[]}
              status="automatic"
            />

            <BadgeCard
              icon="✓"
              iconColor="text-blue-400"
              badgeClass="bg-blue-500/15 text-blue-400 border-blue-500/20"
              name="Hockystick Checked"
              tagline="Digital presence independently verified"
              how="Automatic daily check. No action needed from the investor."
              checks={[
                "Fund or firm website resolves",
                "LinkedIn profile URL is valid",
                "Email domain matches fund website",
                "Public signals found in AI research",
              ]}
              notClaimed={[
                "Does not verify fund size",
                "Does not verify portfolio companies",
                "Does not verify investment history",
                "Self-reported claims are not confirmed",
              ]}
              status="automatic"
            />

            <BadgeCard
              icon="✦"
              iconColor="text-[#7C3AED]"
              badgeClass="bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/20"
              name="Hockystick Verified"
              tagline="Track record and identity independently confirmed"
              how="Manual review by the Hockystick team. Reserved for active investors who have completed at least one deal on the platform."
              checks={[
                "Government-issued ID verified",
                "Fund or entity registration confirmed",
                "At least one completed deal on Hockystick",
                "Reference check from portfolio founder",
              ]}
              notClaimed={[]}
              status="coming_soon"
              availableText="Available Q3 2026"
            />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 text-center border-t border-white/8 max-w-5xl mx-auto">
        <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-4">
          Built on honest verification
        </p>
        <h2
          className="font-bold text-2xl text-white mb-4"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          We only claim what we can prove.
        </h2>
        <p className="text-white/50 max-w-xl mx-auto text-sm leading-relaxed mb-8">
          Wrong information in an investment context is worse than no information. Every badge on
          Hockystick is backed by a specific, documented check — never an assumption.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="/sign-up"
            className="px-6 py-3 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:bg-[#6d28d9] transition-colors"
          >
            Start raising →
          </a>
          <a
            href="/sign-up?role=investor"
            className="px-6 py-3 border border-white/15 text-white/70 rounded-lg text-sm font-medium hover:border-white/30 hover:text-white transition-colors"
          >
            Invest on Hockystick →
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
