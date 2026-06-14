import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/registry")({
  head: () => ({
    meta: [
      { title: "Company Registry Check — Hockystick" },
      {
        name: "description",
        content:
          "Search across OpenCorporates (140+ jurisdictions), UK Companies House, and DIFC entity register simultaneously. Free. No account required.",
      },
    ],
  }),
  component: Registry,
});

interface RegistryResult {
  company: string;
  opencorporates: {
    found: boolean;
    status: string;
    jurisdiction: string;
    registeredDate: string;
    url: string;
    confidence: number;
  };
  companies_house: {
    found: boolean;
    status: string;
    number: string;
    url: string;
    confidence: number;
  };
  difc: {
    found: boolean;
    status: string;
    confidence: number;
  };
  verified: boolean;
  confidence: number;
  summary: string;
}

function Registry() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RegistryResult | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim() || query.trim().length < 2) return;
    setLoading(true);
    setSearched(false);
    setResults(null);

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/registry-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ company_name: query.trim() }),
        }
      );

      const data = await res.json();
      if (data.result) {
        setResults(data.result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  const dropdownCls = "block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors";

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24">

        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-12"
        >
          ← Back to Hockystick
        </a>

        {/* Header */}
        <p className="text-xs text-[#7C3AED] uppercase tracking-[0.2em] mb-4">
          Company Registry
        </p>
        <h1
          className="font-bold text-3xl sm:text-4xl text-white mb-3 leading-tight"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Check if a company is registered
        </h1>
        <p className="text-white/50 text-sm leading-relaxed mb-10">
          Search across OpenCorporates (140+ jurisdictions including UAE, UK, US, Saudi Arabia,
          Bahrain, Qatar), UK Companies House, and DIFC entity register — simultaneously.
          Free. No account required.
        </p>

        {/* Search input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Revolut, Careem, Tabby..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-white/25 focus:border-[#7C3AED]/50 outline-none transition-colors"
          />
          <button
            onClick={handleSearch}
            disabled={loading || query.trim().length < 2}
            className="px-6 py-3.5 bg-[#7C3AED] text-white rounded-xl text-sm font-medium hover:bg-[#6d28d9] disabled:opacity-40 transition-colors shrink-0"
          >
            {loading ? "⟳ Searching..." : "Search"}
          </button>
        </div>

        {/* Registries being checked */}
        <div className="flex flex-wrap gap-2 mb-10">
          {["OpenCorporates (140+ jurisdictions)", "UK Companies House", "DIFC Entity Register"].map((r) => (
            <span
              key={r}
              className="text-xs text-white/30 border border-white/8 px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              {r}
            </span>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
            ))}
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div className="space-y-3">

            {/* Overall verdict */}
            <div
              className="p-5 rounded-xl mb-6"
              style={{
                background: results.verified ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
                border: results.verified ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{results.verified ? "✓" : "○"}</span>
                <p className="text-sm font-semibold text-white">
                  {results.verified
                    ? `Registration signal found — ${results.confidence}% confidence`
                    : "No registration found in checked registries"}
                </p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                {results.summary}
              </p>
            </div>

            <p className="text-xs text-white/30 uppercase tracking-wider mb-3">
              Registry breakdown
            </p>

            {/* OpenCorporates */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: results.opencorporates.found ? "rgba(124,58,237,0.07)" : "rgba(255,255,255,0.02)",
                border: results.opencorporates.found ? "1px solid rgba(124,58,237,0.2)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white">OpenCorporates</p>
                <span
                  className="text-xs font-semibold"
                  style={{ color: results.opencorporates.found ? "#a78bfa" : "rgba(255,255,255,0.2)" }}
                >
                  {results.opencorporates.found ? "✓ Found" : "○ Not found"}
                </span>
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                140+ jurisdictions including UAE, UK, US, Saudi Arabia, Bahrain, Qatar
              </p>
              {results.opencorporates.found && (
                <div className="mt-2 space-y-0.5">
                  {results.opencorporates.jurisdiction && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Jurisdiction: {results.opencorporates.jurisdiction.toUpperCase()}
                    </p>
                  )}
                  {results.opencorporates.status && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Status: {results.opencorporates.status}
                    </p>
                  )}
                  {results.opencorporates.registeredDate && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Incorporated: {results.opencorporates.registeredDate}
                    </p>
                  )}
                  {results.opencorporates.url && (
                    <a
                      href={results.opencorporates.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:underline block mt-1"
                      style={{ color: "#7C3AED" }}
                    >
                      ↗ View on OpenCorporates
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* UK Companies House */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: results.companies_house.found ? "rgba(124,58,237,0.07)" : "rgba(255,255,255,0.02)",
                border: results.companies_house.found ? "1px solid rgba(124,58,237,0.2)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white">UK Companies House</p>
                <span
                  className="text-xs font-semibold"
                  style={{ color: results.companies_house.found ? "#a78bfa" : "rgba(255,255,255,0.2)" }}
                >
                  {results.companies_house.found ? "✓ Found" : "○ Not found"}
                </span>
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Official UK government company register
              </p>
              {results.companies_house.found && (
                <div className="mt-2 space-y-0.5">
                  {results.companies_house.number && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Company number: {results.companies_house.number}
                    </p>
                  )}
                  {results.companies_house.status && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Status: {results.companies_house.status}
                    </p>
                  )}
                  {results.companies_house.url && (
                    <a
                      href={results.companies_house.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:underline block mt-1"
                      style={{ color: "#7C3AED" }}
                    >
                      ↗ View on Companies House
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* DIFC */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: results.difc.found ? "rgba(124,58,237,0.07)" : "rgba(255,255,255,0.02)",
                border: results.difc.found ? "1px solid rgba(124,58,237,0.2)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white">DIFC Entity Register</p>
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: results.difc.found
                      ? "#a78bfa"
                      : results.difc.status === "unavailable"
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(255,255,255,0.2)",
                  }}
                >
                  {results.difc.found
                    ? "✓ Found"
                    : results.difc.status === "unavailable"
                    ? "— Unavailable"
                    : "○ Not found"}
                </span>
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Dubai International Financial Centre entity register
              </p>
            </div>

            {/* Disclaimer */}
            <p className="text-xs mt-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.2)" }}>
              Results are sourced from public registries and are not manually confirmed. A "not found"
              result does not confirm non-existence — registries may be incomplete or use different
              name formats. Always verify directly with the relevant authority.
            </p>

            {/* CTA */}
            <div
              className="mt-8 p-5 rounded-xl"
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              <p className="text-sm font-semibold text-white mb-1">Raising capital?</p>
              <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
                Hockystick automatically runs registry checks on all founder profiles — plus
                LinkedIn verification, AI document review, and investor matching. Free during beta.
              </p>
              <a
                href="/sign-up"
                className="text-xs font-medium px-4 py-2 rounded-lg inline-block transition-colors"
                style={{ background: "#7C3AED", color: "#fff" }}
              >
                Build your verified profile →
              </a>
            </div>
          </div>
        )}

        {/* Error / no results */}
        {searched && !results && !loading && (
          <div className="text-center py-12">
            <p className="text-white/30 text-sm">Something went wrong. Try again.</p>
          </div>
        )}

      </main>
      <SiteFooter />
    </div>
  );
}
