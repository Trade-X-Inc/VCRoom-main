import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Startup Resources — Hockystick" },
      {
        name: "description",
        content:
          "Accelerators, grants, VC funds, and programs from GCC, MENA, EU, NA, SEA, and Africa. Everything you need to fund your startup.",
      },
    ],
  }),
  component: Resources,
});

// ── Data ──────────────────────────────────────────────────────────

const accelerators = [
  { name: "DIFC FinTech Hive", region: "GCC", country: "UAE", focus: "Fintech, Insurtech", stage: "Seed, Series A", offer: "Mentorship, regulatory access, investor network", url: "https://fintechhive.difc.ae" },
  { name: "Hub71", region: "GCC", country: "UAE", focus: "Tech, AI, Deep Tech", stage: "Seed", offer: "Up to $150K equity-free + subsidized housing", url: "https://hub71.com" },
  { name: "Flat6Labs", region: "MENA", country: "Multi-country", focus: "Tech, Consumer", stage: "Pre-seed, Seed", offer: "$15K–$30K + equity stake", url: "https://flat6labs.com" },
  { name: "Sheraa", region: "GCC", country: "UAE", focus: "Social Impact, Tech", stage: "Idea, Early", offer: "Equity-free grants up to $100K", url: "https://sheraa.ae" },
  { name: "Saudi Aramco Accelerator", region: "GCC", country: "Saudi Arabia", focus: "Energy, Industrial Tech", stage: "Early, Growth", offer: "Pilot projects + funding access", url: "https://accelerator.aramco.com" },
  { name: "Tamkeen Bahrain", region: "GCC", country: "Bahrain", focus: "All sectors", stage: "Seed, Growth", offer: "Grants and training subsidies", url: "https://tamkeen.bh" },
  { name: "Startupbootcamp", region: "EU", country: "Multi-country", focus: "Fintech, Health, Smart Cities", stage: "Seed", offer: "€15K + 3 months mentorship", url: "https://startupbootcamp.org" },
  { name: "Seedcamp", region: "EU", country: "UK", focus: "Tech", stage: "Pre-seed, Seed", offer: "€200K for 7–10% equity", url: "https://seedcamp.com" },
  { name: "Station F", region: "EU", country: "France", focus: "All tech", stage: "Early", offer: "World's largest startup campus, €250/month desk", url: "https://stationf.co" },
  { name: "Y Combinator", region: "NA", country: "USA", focus: "All tech", stage: "Seed", offer: "$500K for 7% equity + YC network", url: "https://ycombinator.com" },
  { name: "Techstars", region: "Global", country: "Multi-country", focus: "All sectors", stage: "Seed", offer: "$120K for 6% equity", url: "https://techstars.com" },
  { name: "500 Global", region: "Global", country: "Multi-country", focus: "All tech", stage: "Pre-seed, Seed", offer: "$150K for 6% equity", url: "https://500.co" },
  { name: "Antler", region: "Global", country: "Multi-country", focus: "All sectors", stage: "Pre-idea, Pre-seed", offer: "$100K–$200K for 10–15% equity", url: "https://antler.co" },
  { name: "Entrepreneur First", region: "Global", country: "Multi-country", focus: "Deep Tech, AI", stage: "Pre-idea", offer: "£80K for ~10% equity", url: "https://efsglobal.com" },
  { name: "Iterative", region: "SEA", country: "Singapore", focus: "B2B SaaS, Marketplace", stage: "Pre-seed, Seed", offer: "$150K for 10% equity", url: "https://iterative.vc" },
  { name: "Surge", region: "SEA", country: "Singapore", focus: "Consumer, B2B", stage: "Seed", offer: "$1M–$2M initial investment", url: "https://surgeahead.com" },
  { name: "Y Combinator Africa", region: "Africa", country: "Remote", focus: "All tech", stage: "Seed", offer: "Same as YC global", url: "https://ycombinator.com" },
  { name: "Startupbootcamp Africa", region: "Africa", country: "South Africa", focus: "Fintech, AgriTech", stage: "Seed", offer: "Equity-free + $15K stipend", url: "https://startupbootcamp.org/accelerator/africa-fintech" },
];

const grants = [
  { name: "Khalifa Fund", region: "GCC", country: "UAE", amount: "Up to AED 3M", focus: "SMEs, Startups", eligibility: "UAE Nationals only", url: "https://khalifafund.ae" },
  { name: "Mohammed Bin Rashid Innovation Fund", region: "GCC", country: "UAE", amount: "Up to AED 5M", focus: "Innovation, Tech", eligibility: "UAE-registered companies", url: "https://mbrf.ae" },
  { name: "Hub71 Equity-Free Grants", region: "GCC", country: "UAE", amount: "$30K–$150K", focus: "Tech, AI", eligibility: "Hub71 members", url: "https://hub71.com" },
  { name: "ADGM Catalyst Fund", region: "GCC", country: "UAE", amount: "Varies", focus: "Fintech, Capital Markets", eligibility: "ADGM-registered entities", url: "https://adgm.com" },
  { name: "Saudi Vision 2030 Grants", region: "GCC", country: "Saudi Arabia", amount: "Varies by program", focus: "All sectors aligned with Vision 2030", eligibility: "Saudi-registered companies", url: "https://vision2030.gov.sa" },
  { name: "AWS Activate", region: "Global", country: "Remote", amount: "Up to $100K credits", focus: "All tech", eligibility: "Startups with investors or accelerators", url: "https://aws.amazon.com/activate" },
  { name: "Google for Startups", region: "Global", country: "Remote", amount: "Up to $200K GCP credits", focus: "All tech", eligibility: "Seed to Series A", url: "https://cloud.google.com/startup" },
  { name: "Microsoft for Startups", region: "Global", country: "Remote", amount: "Up to $150K Azure credits", focus: "All tech", eligibility: "All startups", url: "https://startups.microsoft.com" },
  { name: "EU Horizon Grants", region: "EU", country: "Multi-country", amount: "€50K–€2.5M", focus: "Deep Tech, Research", eligibility: "EU-registered entities", url: "https://eic.ec.europa.eu" },
  { name: "Innovate UK", region: "EU", country: "UK", amount: "£25K–£10M", focus: "Innovation, Tech", eligibility: "UK-registered companies", url: "https://iuk.ktn-uk.org" },
  { name: "GSMA Innovation Fund", region: "Africa", country: "Multi-country", amount: "Up to $250K", focus: "Mobile, AgriTech, FinTech", eligibility: "Sub-Saharan Africa startups", url: "https://gsma.com/mobile-for-development/innovation-fund" },
  { name: "Google.org Impact Challenge", region: "Global", country: "Remote", amount: "Up to $3M", focus: "Social Impact, AI for Good", eligibility: "Nonprofits and social enterprises", url: "https://impactchallenge.withgoogle.com" },
];

const vcFunds = [
  { name: "STV", region: "GCC", country: "Saudi Arabia", focus: "Tech, Growth", stage: "Series A–C", checkSize: "$1M–$30M", portfolio: "Careem, Unifonic, Sary", url: "https://stv.vc" },
  { name: "Wamda Capital", region: "MENA", country: "UAE", focus: "Tech, Consumer", stage: "Seed, Series A", checkSize: "$500K–$5M", portfolio: "Careem, Fetchr, Mumzworld", url: "https://wamda.com" },
  { name: "Flat6Labs Ventures", region: "MENA", country: "Multi-country", focus: "Tech, Consumer", stage: "Pre-seed, Seed", checkSize: "$50K–$500K", portfolio: "Multiple MENA startups", url: "https://flat6labs.com" },
  { name: "Global Ventures", region: "MENA", country: "UAE", focus: "Tech, Fintech", stage: "Series A–B", checkSize: "$1M–$20M", portfolio: "Trella, Mamopay", url: "https://globalventures.vc" },
  { name: "Algebra Ventures", region: "MENA", country: "Egypt", focus: "Tech", stage: "Seed, Series A", checkSize: "$500K–$3M", portfolio: "Breadfast, Cartona", url: "https://algebraventures.com" },
  { name: "Index Ventures", region: "EU", country: "UK", focus: "Tech, Consumer", stage: "Series A–C", checkSize: "$1M–$50M", portfolio: "Revolut, Figma, Notion", url: "https://indexventures.com" },
  { name: "Balderton Capital", region: "EU", country: "UK", focus: "Tech, B2B", stage: "Series A–B", checkSize: "$5M–$30M", portfolio: "Revolut, Depop, Cleo", url: "https://balderton.com" },
  { name: "Sequoia Southeast Asia", region: "SEA", country: "Singapore", focus: "Tech, Consumer", stage: "Seed–Series B", checkSize: "$100K–$20M", portfolio: "Gojek, Tokopedia", url: "https://sequoiacap.com" },
  { name: "a16z", region: "NA", country: "USA", focus: "Tech, Crypto, Bio", stage: "Seed–Growth", checkSize: "$100K–$100M+", portfolio: "Airbnb, Coinbase, GitHub", url: "https://a16z.com" },
  { name: "Sequoia Capital", region: "NA", country: "USA", focus: "Tech", stage: "Seed–Growth", checkSize: "$100K–$100M+", portfolio: "Apple, Google, WhatsApp", url: "https://sequoiacap.com" },
  { name: "TLcom Capital", region: "Africa", country: "Kenya", focus: "Tech", stage: "Series A–B", checkSize: "$500K–$10M", portfolio: "Andela, Twiga", url: "https://tlcomcapital.com" },
  { name: "Partech Africa", region: "Africa", country: "Senegal", focus: "Tech", stage: "Series A", checkSize: "$1M–$10M", portfolio: "Wave, MFS Africa", url: "https://partechpartners.com" },
];

const programs = [
  { name: "MIT Solve", region: "Global", country: "USA", focus: "Social Impact, Tech for Good", stage: "All stages", offer: "Up to $10K prize + network access", url: "https://solve.mit.edu" },
  { name: "Seedstars World", region: "Global", country: "Multi-country", focus: "Emerging markets tech", stage: "Seed", offer: "$500K investment for top startup", url: "https://seedstars.com" },
  { name: "UNDP Innovation Facility", region: "Global", country: "Remote", focus: "Sustainable Development", stage: "Early", offer: "Grants + UNDP network access", url: "https://undp.org/innovation" },
  { name: "IFC Startup Catalyst", region: "Global", country: "Remote", focus: "Emerging markets", stage: "Seed, Series A", offer: "Investment + World Bank network", url: "https://ifc.org" },
  { name: "World Bank infoDev", region: "Global", country: "Remote", focus: "Digital, Agriculture, Climate", stage: "Early", offer: "Grants + technical assistance", url: "https://worldbank.org" },
  { name: "Halcyon Incubator", region: "NA", country: "USA", focus: "Social Entrepreneurship", stage: "Early", offer: "Stipend + mentorship + housing", url: "https://halcyon.org" },
  { name: "ADGM RegLab", region: "GCC", country: "UAE", focus: "Fintech, Regtech", stage: "Early, Growth", offer: "Regulatory sandbox + ADGM support", url: "https://adgm.com/fsra/innovation/reglab" },
  { name: "DIFC Innovation Hub", region: "GCC", country: "UAE", focus: "Fintech, Tech", stage: "Seed, Series A", offer: "Office space + regulatory support + investor access", url: "https://difcinnovationhub.com" },
  { name: "Misk Entrepreneurship", region: "GCC", country: "Saudi Arabia", focus: "Youth entrepreneurship", stage: "Pre-seed, Seed", offer: "Grants + mentorship + community", url: "https://misk.org.sa" },
  { name: "Wamda Programs", region: "MENA", country: "UAE", focus: "Entrepreneurs in MENA", stage: "All stages", offer: "Education, network, research", url: "https://wamda.com" },
  { name: "Endeavor MENA", region: "MENA", country: "Multi-country", focus: "High-impact entrepreneurs", stage: "Scale-up", offer: "Global network + mentors + capital access", url: "https://endeavor.org" },
  { name: "EY Entrepreneur Of The Year", region: "Global", country: "Multi-country", focus: "All sectors", stage: "Growth", offer: "Recognition + global network", url: "https://ey.com/eoy" },
];

// ── Types ─────────────────────────────────────────────────────────

type Region = "All" | "GCC" | "MENA" | "EU" | "NA" | "SEA" | "Africa" | "Global";
type Tab = "accelerators" | "grants" | "vcfunds" | "programs";

// ── Region badge colors ───────────────────────────────────────────

const regionColors: Record<string, { bg: string; color: string }> = {
  GCC:    { bg: "rgba(124,58,237,0.15)", color: "#a78bfa" },
  MENA:   { bg: "rgba(124,58,237,0.10)", color: "#c4b5fd" },
  EU:     { bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
  NA:     { bg: "rgba(16,185,129,0.12)", color: "#6ee7b7" },
  SEA:    { bg: "rgba(245,158,11,0.12)", color: "#fcd34d" },
  Africa: { bg: "rgba(239,68,68,0.12)",  color: "#fca5a5" },
  Global: { bg: "var(--accent)", color: "var(--muted-foreground)" },
};

function RegionBadge({ region }: { region: string }) {
  const c = regionColors[region] ?? regionColors.Global;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: c.bg, color: c.color }}
    >
      {region}
    </span>
  );
}

// ── Cards ─────────────────────────────────────────────────────────

function AcceleratorCard({ item }: { item: typeof accelerators[0] }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: "var(--accent)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground leading-tight">{item.name}</p>
        <RegionBadge region={item.region} />
      </div>
      <p className="text-xs" style={{ color: "var(--faint)" }}>{item.country}</p>
      <div className="space-y-1">
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Focus: </span>{item.focus}
        </p>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Stage: </span>{item.stage}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Offer: </span>{item.offer}
        </p>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto text-xs font-medium px-3 py-1.5 rounded-lg w-fit transition-colors"
        style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}
      >
        Apply →
      </a>
    </div>
  );
}

function GrantCard({ item }: { item: typeof grants[0] }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: "var(--accent)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground leading-tight">{item.name}</p>
        <RegionBadge region={item.region} />
      </div>
      <p className="text-xs" style={{ color: "var(--faint)" }}>{item.country}</p>
      <div className="space-y-1">
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Amount: </span>
          <span style={{ color: "#10B981" }}>{item.amount}</span>
        </p>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Focus: </span>{item.focus}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Eligibility: </span>{item.eligibility}
        </p>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto text-xs font-medium px-3 py-1.5 rounded-lg w-fit transition-colors"
        style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}
      >
        Learn more →
      </a>
    </div>
  );
}

function VCCard({ item }: { item: typeof vcFunds[0] }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: "var(--accent)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground leading-tight">{item.name}</p>
        <RegionBadge region={item.region} />
      </div>
      <p className="text-xs" style={{ color: "var(--faint)" }}>{item.country}</p>
      <div className="space-y-1">
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Focus: </span>{item.focus}
        </p>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Stage: </span>{item.stage}
        </p>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Check: </span>
          <span style={{ color: "#a78bfa" }}>{item.checkSize}</span>
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Portfolio: </span>{item.portfolio}
        </p>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto text-xs font-medium px-3 py-1.5 rounded-lg w-fit transition-colors"
        style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}
      >
        Visit fund →
      </a>
    </div>
  );
}

function ProgramCard({ item }: { item: typeof programs[0] }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: "var(--accent)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground leading-tight">{item.name}</p>
        <RegionBadge region={item.region} />
      </div>
      <p className="text-xs" style={{ color: "var(--faint)" }}>{item.country}</p>
      <div className="space-y-1">
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Focus: </span>{item.focus}
        </p>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Stage: </span>{item.stage}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--faint)" }}>Offer: </span>{item.offer}
        </p>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto text-xs font-medium px-3 py-1.5 rounded-lg w-fit transition-colors"
        style={{ background: "var(--accent)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
      >
        Learn more →
      </a>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

function Resources() {
  const [tab, setTab] = useState<Tab>("accelerators");
  const [region, setRegion] = useState<Region>("All");

  const regions: Region[] = ["All", "GCC", "MENA", "EU", "NA", "SEA", "Africa", "Global"];

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "accelerators", label: "Accelerators", count: accelerators.length },
    { id: "grants",       label: "Grants",        count: grants.length },
    { id: "vcfunds",      label: "VC Funds",      count: vcFunds.length },
    { id: "programs",     label: "Programs",      count: programs.length },
  ];

  function filterByRegion<T extends { region: string }>(items: T[]): T[] {
    if (region === "All") return items;
    return items.filter((i) => i.region === region);
  }

  const visibleAccelerators = filterByRegion(accelerators);
  const visibleGrants       = filterByRegion(grants);
  const visibleVC           = filterByRegion(vcFunds);
  const visiblePrograms     = filterByRegion(programs);

  const currentCount =
    tab === "accelerators" ? visibleAccelerators.length :
    tab === "grants"       ? visibleGrants.length :
    tab === "vcfunds"      ? visibleVC.length :
    visiblePrograms.length;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">

        {/* Back */}
        <a href="/" className="inline-flex items-center gap-2 text-sm transition-colors mb-12" style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
        >
          ← Back to Hockystick
        </a>

        {/* Hero */}
        <div className="mb-12">
          <p className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "var(--brand)" }}>
            Startup Resources
          </p>
          <h1
            className="font-bold text-3xl sm:text-4xl md:text-5xl mb-4 leading-tight"
            style={{ fontFamily: "Syne, sans-serif", color: "#ffffff" }}
          >
            Everything you need to fund your startup
          </h1>
          <p className="text-sm leading-relaxed max-w-2xl" style={{ color: "var(--muted-foreground)" }}>
            Accelerators, grants, VC funds, and programs from GCC, MENA, EU, NA, SEA, and Africa.
            Updated regularly. Verify all terms directly with each organization.
          </p>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
          style={{ background: "var(--accent)", border: "1px solid var(--border)" }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              style={
                tab === t.id
                  ? { background: "var(--gradient-brand)", color: "#fff" }
                  : { color: "var(--muted-foreground)" }
              }
            >
              {t.label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={
                  tab === t.id
                    ? { background: "var(--accent)", color: "var(--foreground)" }
                    : { background: "var(--accent)", color: "var(--faint)" }
                }
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Region filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {regions.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={
                region === r
                  ? { background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.5)", color: "#a78bfa" }
                  : { background: "var(--accent)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }
              }
            >
              {r}
            </button>
          ))}
          {currentCount > 0 && (
            <span className="text-xs self-center ml-2" style={{ color: "var(--faint)" }}>
              {currentCount} result{currentCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Grid */}
        {tab === "accelerators" && (
          visibleAccelerators.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleAccelerators.map((item) => <AcceleratorCard key={item.name} item={item} />)}
            </div>
          ) : <EmptyState region={region} />
        )}
        {tab === "grants" && (
          visibleGrants.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleGrants.map((item) => <GrantCard key={item.name} item={item} />)}
            </div>
          ) : <EmptyState region={region} />
        )}
        {tab === "vcfunds" && (
          visibleVC.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleVC.map((item) => <VCCard key={item.name} item={item} />)}
            </div>
          ) : <EmptyState region={region} />
        )}
        {tab === "programs" && (
          visiblePrograms.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visiblePrograms.map((item) => <ProgramCard key={item.name} item={item} />)}
            </div>
          ) : <EmptyState region={region} />
        )}

        {/* Disclaimer */}
        <p className="text-xs mt-12 leading-relaxed max-w-2xl" style={{ color: "var(--faint)" }}>
          ⚠ Program details change frequently. Verify all terms directly with each organization before
          applying. Hockystick is not affiliated with any of these programs.
        </p>

        {/* CTA */}
        <div
          className="mt-8 p-6 rounded-xl max-w-2xl"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          <p className="text-sm font-semibold text-foreground mb-1">Ready to raise?</p>
          <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
            Build a verified founder profile on Hockystick and get matched with investors aligned
            to your sector, stage, and region. Free during beta.
          </p>
          <a
            href="/sign-up"
            className="text-xs font-medium px-4 py-2 rounded-lg inline-block transition-colors"
            style={{ background: "var(--gradient-brand)", color: "#fff" }}
          >
            Build your verified profile →
          </a>
        </div>

      </main>
      <SiteFooter />
    </div>
  );
}

function EmptyState({ region }: { region: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm" style={{ color: "var(--faint)" }}>
        No results for region "{region}". Try "All" or another region.
      </p>
    </div>
  );
}
