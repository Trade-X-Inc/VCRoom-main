import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Hockystick" },
      { name: "description", content: "Free during beta. Team collaboration, role-based access, and AI-powered deal flow — built for founders and investors." },
    ],
  }),
  component: PricingPage,
});

const plans = [
  {
    name: "Free",
    price: 0,
    tagline: "For solo founders and investors getting started",
    borderColor: "border-white/8",
    badge: "Beta" as string | null,
    badgeStyle: { background: "rgba(16,185,129,0.15)", color: "#10B981" } as React.CSSProperties,
    teamCallout: { emoji: "👤", text: "Solo only — upgrade for team access" },
    teamCalloutStyle: {} as React.CSSProperties,
    features: [
      "1 founder or investor profile",
      "Verified public profile",
      "3 active deal rooms",
      "20 AI advisor calls / day",
      "Basic profile analytics",
    ],
    notIncluded: [
      "No team members",
      "No document analytics",
      "No priority matching",
    ],
    cta: "Start free",
    ctaUrl: "/sign-up?plan=free",
    featured: false,
    comingSoon: false,
  },
  {
    name: "Starter",
    price: 49,
    tagline: "For founders and investors with a small team",
    borderColor: "border-white/10",
    badge: "Most popular" as string | null,
    badgeStyle: { background: "#7C3AED", color: "#fff" } as React.CSSProperties,
    teamCallout: { emoji: "👥", text: "Add 1 team member · Assign them to specific deal rooms · They only see what you allow" },
    teamCalloutStyle: { border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.06)" } as React.CSSProperties,
    features: [
      "Everything in Free",
      "1 additional team member (2 users total)",
      "Role-based access (Admin / Manager / Analyst / Viewer)",
      "5 active deal rooms",
      "50 AI advisor calls / day",
      "Document view analytics",
      "Priority thesis matching",
    ],
    notIncluded: [
      "No external analyst access",
      "No advanced deal room controls",
    ],
    cta: "Start raising",
    ctaUrl: "/sign-up?plan=starter",
    featured: true,
    comingSoon: false,
  },
  {
    name: "Pro",
    price: 99,
    tagline: "For serious fundraisers and active investors",
    borderColor: "border-white/10",
    badge: null as string | null,
    badgeStyle: {} as React.CSSProperties,
    teamCallout: { emoji: "👥", text: "Up to 5 users total · Your CFO in the data room · Your legal counsel reviewing documents · Your analyst running DD — without seeing everything · Each person sees only what you assign them" },
    teamCalloutStyle: { border: "1px solid rgba(124,58,237,0.4)", background: "rgba(124,58,237,0.08)" } as React.CSSProperties,
    features: [
      "Everything in Starter",
      "Up to 4 additional team members (5 users total)",
      "External analyst / agency access",
      "Per-deal-room team assignment",
      "15 active deal rooms",
      "200 AI advisor calls / day",
      "Advanced profile analytics",
      "Priority deal matching + notifications",
      "Custom team roles per deal room",
    ],
    notIncluded: [] as string[],
    cta: "Start raising",
    ctaUrl: "/sign-up?plan=pro",
    featured: false,
    comingSoon: false,
  },
  {
    name: "Scale",
    price: 499,
    tagline: "For serious raises of $2M and above",
    borderColor: "border-white/20",
    badge: null as string | null,
    badgeStyle: {} as React.CSSProperties,
    teamCallout: null,
    teamCalloutStyle: {} as React.CSSProperties,
    features: [
      "Everything in Pro",
      "Hockystick Verified badge (manual review)",
      "White-glove profile setup",
      "Dedicated investor matching",
      "Deal brief generation for matched investors",
      "Term sheet builder",
      "Custom NDA templates",
      "API access",
      "Dedicated account manager",
    ],
    notIncluded: [] as string[],
    cta: "Talk to us",
    ctaUrl: "/contact?plan=scale",
    featured: false,
    comingSoon: false,
  },
  {
    name: "Enterprise",
    price: null as number | null,
    tagline: "For accelerators, funds, and platforms",
    borderColor: "border-white/8",
    badge: "Coming soon" as string | null,
    badgeStyle: { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" } as React.CSSProperties,
    teamCallout: null,
    teamCalloutStyle: {} as React.CSSProperties,
    features: [
      "Multi-founder cohort management",
      "White-label deal rooms",
      "Bulk founder onboarding",
      "Custom verification workflows",
      "Investor network access",
      "Analytics dashboard for fund managers",
      "SLA support",
      "Custom contract",
    ],
    notIncluded: [] as string[],
    cta: "Join waitlist",
    ctaUrl: "/contact?plan=enterprise",
    featured: false,
    comingSoon: true,
  },
];

const faqs = [
  {
    q: "Is it really free during beta?",
    a: "Yes. All features are free during the beta period. When paid plans launch, existing beta users get 60 days free on their chosen tier.",
  },
  {
    q: "Does Hockystick take a success fee?",
    a: "No. We charge subscription fees only. There is no success fee or commission on deals closed through the platform.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes. Upgrade or downgrade at any time. Changes take effect on your next billing date.",
  },
  {
    q: "What is the Hockystick Verified badge?",
    a: "The Verified badge is a manual review by the Hockystick team confirming your identity and business. It signals to investors that your profile has been independently checked. Available on Scale plan and above.",
  },
  {
    q: "Can team members have different access levels?",
    a: "Yes. Each team member gets a role: Admin (full access), Manager (operations), Analyst (documents & DD), or Viewer (read-only). For investor teams: Admin, Associate, Analyst, or External. Roles can be changed at any time.",
  },
  {
    q: "What is External Analyst access?",
    a: "External Analysts can only access deal rooms you explicitly assign them to — they cannot see your discovery feed, pipeline, or investment thesis. Designed for third-party DD firms, legal advisors, and agencies.",
  },
  {
    q: "Do you support Arabic language?",
    a: "English-first for now. Arabic interface and Arabic-language AI analysis are on the roadmap for Q4 2026.",
  },
  {
    q: "What is the accelerator/enterprise plan?",
    a: "The Enterprise plan lets accelerators and VC firms onboard their entire cohort or portfolio onto Hockystick, with a unified dashboard. Launching Q3 2026 — join the waitlist via the contact form.",
  },
];

const founderRolesTable = {
  headers: ["Feature", "Owner", "Admin", "Manager", "Analyst", "Viewer"],
  rows: [
    ["Edit profile",            true,  true,  true,  false, false],
    ["Create deal rooms",       true,  true,  true,  false, false],
    ["Upload documents",        true,  true,  true,  true,  false],
    ["AI Advisor",              true,  true,  true,  true,  false],
    ["Pipeline management",     true,  true,  true,  false, false],
    ["Analytics",               true,  true,  true,  false, false],
    ["Manage team",             true,  true,  false, false, false],
    ["View assigned deal rooms",true,  true,  true,  true,  true ],
  ],
};

const investorRolesTable = {
  headers: ["Feature", "Owner", "Admin", "Associate", "Analyst", "External"],
  rows: [
    ["Browse startups",         true,  true,  true,  true,  false],
    ["Request access",          true,  true,  true,  false, false],
    ["Submit decisions",        true,  true,  false, false, false],
    ["Run AI analysis",         true,  true,  true,  true,  true ],
    ["Manage team",             true,  true,  false, false, false],
    ["View assigned deal rooms",true,  true,  true,  true,  true ],
  ],
};

function CheckOrDash({ value }: { value: boolean }) {
  return (
    <span style={{ color: value ? "#10B981" : "rgba(255,255,255,0.2)", fontWeight: 600, fontSize: 15 }}>
      {value ? "✓" : "—"}
    </span>
  );
}

function RoleTable({ title, table }: { title: string; table: typeof founderRolesTable }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ background: "#111114", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: `2fr ${table.headers.slice(1).map(() => "1fr").join(" ")}`, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {table.headers.map((h, i) => (
            <div key={i} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: i === 0 ? "left" : "center" }}>
              {h}
            </div>
          ))}
        </div>
        {/* Rows */}
        {table.rows.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: "grid",
              gridTemplateColumns: `2fr ${table.headers.slice(1).map(() => "1fr").join(" ")}`,
              padding: "11px 20px",
              borderBottom: ri < table.rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              background: ri % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent",
            }}
          >
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{row[0] as string}</div>
            {(row.slice(1) as boolean[]).map((val, ci) => (
              <div key={ci} style={{ textAlign: "center" }}>
                <CheckOrDash value={val} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <SiteHeader />
      <main className="px-6 py-24">

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs text-[#7C3AED] uppercase tracking-[0.2em] mb-4">Pricing</p>
          <h1 className="font-syne font-bold text-4xl md:text-5xl text-white mb-4 leading-tight">
            Raise with confidence.<br />Pay for results.
          </h1>
          <p className="text-white/60 text-lg">
            Free during beta. Paid plans launch when you're ready.
            No hidden fees. No success fee on deals.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#10B981] bg-[#10B981]/10 px-4 py-2 rounded-full">
            ✓ Free during beta · Upgrade anytime
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 max-w-7xl mx-auto mb-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${plan.borderColor}`}
              style={{ background: plan.featured ? "rgba(124,58,237,0.05)" : "rgba(255,255,255,0.02)" }}
            >
              {plan.badge && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit mb-4" style={plan.badgeStyle}>
                  {plan.badge}
                </span>
              )}

              <p className="font-syne font-bold text-white text-xl mb-1">{plan.name}</p>
              <p className="text-xs text-white/40 mb-4">{plan.tagline}</p>

              {plan.price != null ? (
                <div className="mb-4">
                  <span className="text-4xl font-bold text-white font-syne">${plan.price}</span>
                  <span className="text-white/40 text-sm ml-1">/month</span>
                </div>
              ) : (
                <div className="mb-4">
                  <span className="text-2xl font-bold text-white font-syne">Custom</span>
                </div>
              )}

              {/* Team callout */}
              {plan.teamCallout && (
                <div
                  className="rounded-lg p-3 mb-4 text-xs leading-relaxed"
                  style={{
                    background: Object.keys(plan.teamCalloutStyle).length ? undefined : "rgba(255,255,255,0.04)",
                    border: Object.keys(plan.teamCalloutStyle).length ? undefined : "1px solid rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.6)",
                    ...plan.teamCalloutStyle,
                  }}
                >
                  {plan.teamCallout.emoji} {plan.teamCallout.text}
                </div>
              )}

              <a
                href={plan.ctaUrl}
                className={`block text-center py-3 rounded-xl text-sm font-medium mb-6 transition-colors ${plan.comingSoon ? "cursor-not-allowed" : ""}`}
                style={
                  plan.featured
                    ? { background: "#7C3AED", color: "#fff" }
                    : plan.comingSoon
                    ? { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }
                    : { background: "rgba(255,255,255,0.08)", color: "#fff" }
                }
              >
                {plan.cta}
              </a>

              <div className="space-y-2.5 flex-1">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-[#10B981] mt-0.5 shrink-0">✓</span>
                    <span className="text-white/70">{f}</span>
                  </div>
                ))}
                {plan.notIncluded.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-white/20 mt-0.5 shrink-0">○</span>
                    <span className="text-white/25">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-white/30 mb-20 max-w-2xl mx-auto">
          All plans are free during beta. Paid plans launch when we're ready to scale.
        </p>

        {/* Team benefit section */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="font-syne font-bold text-3xl text-white text-center mb-3">
            Why your team needs Hockystick access
          </h2>
          <p className="text-white/50 text-center text-sm mb-10 max-w-xl mx-auto">
            The best deals are a team effort. Give everyone the right level of access.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div className="rounded-2xl border border-white/8 p-6" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-2xl mb-3">🏗️</div>
              <div className="font-syne font-bold text-white text-base mb-2">Your deal room is a team effort</div>
              <p className="text-white/50 text-sm leading-relaxed">
                Your CFO needs to review financial documents. Your legal counsel needs to see term sheets. Your co-founder needs full visibility.
                On the free plan, you share one login. On Pro, everyone has their own account with the right level of access.
              </p>
            </div>
            {/* Card 2 */}
            <div className="rounded-2xl border border-white/8 p-6" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-2xl mb-3">📊</div>
              <div className="font-syne font-bold text-white text-base mb-2">Your associates handle screening. You handle decisions.</div>
              <p className="text-white/50 text-sm leading-relaxed">
                Associates browse and request access. Analysts run due diligence reports. External DD firms get deal-room-only access —
                they see documents, not your pipeline. You get a clean summary and submit the final call.
              </p>
            </div>
            {/* Card 3 */}
            <div className="rounded-2xl border border-white/8 p-6 relative" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-2xl mb-3">🏢</div>
              <div className="font-syne font-bold text-white text-base mb-2">Built for teams, not just individuals</div>
              <p className="text-white/50 text-sm leading-relaxed">
                Running a cohort program or accelerator? Assign analysts to specific portfolio companies. External agencies can review
                specific deal rooms. Team-level visibility into every active deal.
              </p>
              <div className="mt-4">
                <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">VC program features coming 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Role comparison tables */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="font-syne font-bold text-2xl text-white text-center mb-2">
            What each team role can do
          </h2>
          <p className="text-white/40 text-sm text-center mb-10">
            Role permissions apply across both founder and investor accounts.
          </p>
          <RoleTable title="Founder roles" table={founderRolesTable} />
          <RoleTable title="Investor roles" table={investorRolesTable} />
        </div>

        {/* Investor pricing note */}
        <div className="max-w-3xl mx-auto text-center p-8 rounded-2xl border border-white/8 mb-16" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="font-syne font-bold text-white text-xl mb-2">Investors join free</p>
          <p className="text-white/50 text-sm leading-relaxed">
            Investors access Hockystick at no charge. Browse verified founder profiles, receive thesis-matched deal flow,
            open deal rooms, and run structured due diligence — all free. Premium investor features launching Q3 2026.
          </p>
        </div>

        {/* Web3 waitlist */}
        <div className="max-w-3xl mx-auto text-center p-8 rounded-2xl border border-white/5 mb-16" style={{ background: "rgba(255,255,255,0.01)" }}>
          <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">Coming soon</span>
          <p className="font-syne font-bold text-white text-xl mt-3 mb-2">Hockystick for Web3</p>
          <p className="text-white/40 text-sm leading-relaxed mb-4">
            Verified token raises. On-chain due diligence. VARA-compliant deal rooms.
            Built for the UAE Web3 ecosystem — launching 2027.
          </p>
          <a href="/contact?interest=web3" className="text-sm text-white/50 hover:text-white underline underline-offset-2 transition-colors">
            Join the Web3 waitlist →
          </a>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="font-syne font-bold text-2xl text-white text-center mb-8">Common questions</h2>
          <div className="space-y-4">
            {faqs.map((item, i) => (
              <details key={i} className="border border-white/8 rounded-xl group" style={{ background: "rgba(255,255,255,0.02)" }}>
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none text-sm font-medium text-white">
                  {item.q}
                  <span className="text-white/40 transition-transform group-open:rotate-180 ml-4 shrink-0">↓</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-white/60 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

      </main>
      <SiteFooter />
    </div>
  );
}
