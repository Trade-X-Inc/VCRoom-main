import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CostComparisonTable } from "@/components/site/CostComparisonTable";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/hooks/useSubscription";

// ─────────────────────────────────────────────────────────────────────────────
// Data — plans come from plan_limits, not hardcoded arrays.
// ─────────────────────────────────────────────────────────────────────────────

interface PlanRow {
  plan_id: string;
  plan_name: string;
  user_type: "founder" | "investor" | "both";
  price_monthly_usd: number;
  deal_room_limit: number;
  team_member_limit: number;
  ai_calls_per_month: number;
  vc_connections_limit: number;
  has_full_ai: boolean;
  has_verification: boolean;
  roast_price_usd: number | null;
  extra_deal_room_price_usd: number;
  extra_user_price_usd: number;
  sort_order: number;
}

const getPlans = createServerFn({ method: "GET" }).handler(async (): Promise<PlanRow[]> => {
  const cfEnv = (globalThis as any).__cf_env || {};
  const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL || "";
  const key = cfEnv.SUPABASE_SERVICE_ROLE_KEY || cfEnv.VITE_SUPABASE_ANON_KEY || (import.meta.env as any).VITE_SUPABASE_ANON_KEY || "";
  if (!url || !key) return [];
  const resp = await fetch(
    `${url}/rest/v1/plan_limits?is_active=eq.true&select=*&order=sort_order.asc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!resp.ok) return [];
  return resp.json();
});

// Curated copy per plan — everything numeric comes from the DB row.
const PLAN_COPY: Record<string, { tagline: string; extras: string[]; popular?: boolean }> = {
  founder_starter: {
    tagline: "For founders testing the waters",
    extras: ["Full verification system"],
  },
  founder_pro: {
    tagline: "For founders actively raising",
    extras: ["Everything in Starter"],
    popular: true,
  },
  founder_scale: {
    tagline: "For founders running multiple raises",
    extras: ["Everything in Pro"],
  },
  investor_growth: {
    tagline: "For active investors",
    extras: [],
  },
  investor_pro: {
    tagline: "For funds managing multiple deals",
    extras: ["Priority support"],
  },
  investor_enterprise: {
    tagline: "For institutions onboarding founder cohorts",
    extras: ["White-label cohort tools", "Dedicated onboarding"],
  },
};

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

function planFeatures(p: PlanRow): string[] {
  const isInvestor = p.user_type === "investor";
  const conn = isInvestor ? "startup connections" : "investor connections";
  const features: string[] = [
    p.deal_room_limit >= 999 ? "Unlimited deal rooms" : `${p.deal_room_limit} deal rooms`,
    `${p.team_member_limit} team member${p.team_member_limit === 1 ? "" : "s"}`,
    p.vc_connections_limit >= 9999 ? `Unlimited ${conn}` : `${fmtNum(p.vc_connections_limit)} ${conn}`,
    p.has_full_ai
      ? isInvestor ? "Full AI analysis" : "Full AI (unlimited)"
      : `Basic AI (${p.ai_calls_per_month} calls/month)`,
  ];
  if (!isInvestor && p.roast_price_usd !== null) {
    features.push(
      p.roast_price_usd === 0
        ? "Roast badge: free"
        : p.roast_price_usd < 50
          ? `Roast badge: $${p.roast_price_usd} (discounted)`
          : `Roast badge: $${p.roast_price_usd}`,
    );
  }
  features.push(...(PLAN_COPY[p.plan_id]?.extras ?? []));
  return features;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Hockystick" },
      { name: "description", content: "Simple, honest pricing. 30-day free trial, no credit card required. Founder plans from $19/month, investor plans from $99/month." },
    ],
  }),
  loader: () => getPlans(),
  component: PricingPage,
});

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel before your trial ends and you won't be charged.",
  },
  {
    q: "What happens after 30 days?",
    a: "Your chosen plan activates. We'll remind you 3 days before.",
  },
  {
    q: "Do you offer annual plans?",
    a: "Coming soon. Email us for early pricing.",
  },
  {
    q: "What is the success fee?",
    a: "1.5% of your closed round, minimum $500, maximum $15,000. Only applies to deals closed through Hockystick. Agreed in your deal room NDA.",
  },
];

function PricingPage() {
  const plans = (Route.useLoaderData() ?? []) as PlanRow[];
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [audience, setAudience] = useState<"founder" | "investor">("founder");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Public pages are light — same force-light pattern as the landing page.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    return () => {
      if (hadDark) {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
        root.style.colorScheme = "dark";
      }
    };
  }, []);

  // Default the toggle to the logged-in user's side
  useEffect(() => {
    if (user?.role === "investor") setAudience("investor");
  }, [user?.role]);

  const visible = useMemo(
    () => plans.filter((p) => p.user_type === audience || p.user_type === "both"),
    [plans, audience],
  );

  const currentPlanId = subscription?.plan_id ?? null;

  return (
    <div className="bg-white min-h-screen text-gray-900">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
            Simple, honest pricing
          </h1>
          <p className="mt-3 text-lg text-gray-600">30-day free trial. No credit card required.</p>

          {/* Audience toggle */}
          <div className="mt-8 inline-flex rounded-full border border-[#E4E4E7] bg-gray-50 p-1" role="tablist">
            {(["founder", "investor"] as const).map((a) => (
              <button
                key={a}
                role="tab"
                aria-selected={audience === a}
                onClick={() => setAudience(a)}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition-colors ${
                  audience === a ? "hs-gradient text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {a === "founder" ? "Founders" : "Investors"}
              </button>
            ))}
          </div>
        </div>

        {/* Investor beta framing */}
        {audience === "investor" && (
          <div className="mx-auto mb-10 max-w-2xl rounded-2xl border border-purple-200 bg-purple-50 p-6 text-center">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-purple-700" style={{ fontFamily: "Syne, sans-serif" }}>
              Investor access — free during beta
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              Open registration for investors during beta. Build a verified profile,
              set your thesis, and get thesis-matched deal flow. Founders see your fund,
              thesis, and verification tier before they share.
            </p>
            <Link
              to="/sign-up"
              search={{ role: "investor" } as any}
              className="mt-4 inline-block rounded-lg hs-gradient px-6 py-3 text-sm font-semibold text-white hover:hs-gradient"
            >
              Create investor account →
            </Link>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {visible.map((p) => {
            const copy = PLAN_COPY[p.plan_id];
            const isCurrent = currentPlanId === p.plan_id;
            const isEnterprise = p.plan_id === "investor_enterprise";
            const displayName = p.plan_name.replace(/^(Founder|Investor)\s+/, "");
            return (
              <div
                key={p.plan_id}
                className={`relative flex flex-col border bg-white p-7 ${
                  copy?.popular ? "border-brand" : "border-[#E4E4E7]"
                }`}
              >
                {isCurrent ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white whitespace-nowrap">
                    Your current plan
                  </span>
                ) : copy?.popular ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full hs-gradient px-3 py-1 text-xs font-semibold text-white whitespace-nowrap">
                    Most popular
                  </span>
                ) : null}

                <h2 className="text-lg font-bold" style={{ fontFamily: "Syne, sans-serif" }}>{displayName}</h2>
                <p className="mt-1 text-sm text-gray-500">{copy?.tagline}</p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold" style={{ fontFamily: "Syne, sans-serif" }}>
                    ${fmtNum(p.price_monthly_usd)}
                  </span>
                  <span className="text-sm text-gray-500">/month</span>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {planFeatures(p).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  {isCurrent ? (
                    <div className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
                      You're on this plan
                    </div>
                  ) : isEnterprise ? (
                    <a
                      href="mailto:hello@hockystick.app?subject=Enterprise%20plan"
                      className="block w-full rounded-lg border border-[#E4E4E7] px-4 py-3 text-center text-sm font-semibold text-gray-900 hover:bg-gray-50"
                    >
                      Contact us
                    </a>
                  ) : user ? (
                    <Link
                      to={"/app/settings/billing" as any}
                      className="block w-full rounded-lg hs-gradient px-4 py-3 text-center text-sm font-semibold text-white hover:hs-gradient"
                    >
                      Upgrade
                    </Link>
                  ) : (
                    <Link
                      to={"/sign-up" as any}
                      search={{ plan: p.plan_id, role: p.user_type } as any}
                      className="block w-full rounded-lg hs-gradient px-4 py-3 text-center text-sm font-semibold text-white hover:hs-gradient"
                    >
                      Start free trial
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add-ons */}
        <div className="mt-16 rounded-2xl border border-[#E4E4E7] bg-gray-50 p-8">
          <h2 className="text-xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>Need more? Pay as you go.</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Extra deal room", "$5/month"],
              ["Extra team member", "$5/month"],
              ["Onboarding lawyer consultation", "$40 flat"],
              ["Success fee on closed rounds", "1.5% (min $500, max $15,000)"],
            ].map(([label, price]) => (
              <div key={label} className="rounded-none border border-[#E4E4E7] bg-white px-4 py-3.5">
                <div className="text-sm font-medium text-gray-900">{label}</div>
                <div className="mt-0.5 text-sm text-purple-700 font-semibold">{price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Why we charge founders */}
        <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-[#E4E4E7] bg-gray-50 p-8 text-center">
          <h2 className="text-xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>
            Why we charge founders
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Fundraising infrastructure should be accountable to founders, not to investors.
            We charge founders — not investors — because our job is to make founders
            fundable, not to sell their information to the highest bidder. Your data is
            never sold.
          </p>
        </div>

        {/* Cost comparison vs traditional tools */}
        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-center text-xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>
            What this replaces
          </h2>
          <p className="mt-2 mb-6 text-center text-sm text-gray-600">
            The same work, done the traditional way, costs thousands per raise.
          </p>
          <CostComparisonTable variant="light" compact />
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-center text-xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>Questions</h2>
          <div className="mt-6 divide-y divide-[#E4E4E7] rounded-2xl border border-[#E4E4E7]">
            {FAQS.map((f, i) => (
              <div key={f.q}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-gray-900"
                >
                  {f.q}
                  <ChevronDown className={`h-4 w-4 text-[#71717A] transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <p className="px-5 pb-4 text-sm leading-relaxed text-gray-600">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise CTA */}
        <div className="mt-16 rounded-2xl border border-purple-200 bg-purple-50 p-8 text-center">
          <p className="text-sm text-gray-700">
            Talking to a VC or family office? We handle enterprise contracts differently.
          </p>
          <a
            href="mailto:hello@hockystick.app?subject=Enterprise%20contract"
            className="mt-3 inline-block rounded-lg hs-gradient px-6 py-3 text-sm font-semibold text-white hover:hs-gradient"
          >
            Contact us →
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
