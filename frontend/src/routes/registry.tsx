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
    confidenceLabel: string | null;
    sourceUrl: string | null;
    method: string;
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
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24">

        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          ← Back to Hockystick
        </a>

        {/* Header */}
        <p className="text-xs text-brand uppercase tracking-[0.2em] mb-4">
          Company Registry
        </p>
        <h1
          className="font-bold text-3xl sm:text-4xl text-foreground mb-3 leading-tight"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Check if a company is registered
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-10">
          Search across OpenCorporates (140+ jurisdictions including UAE, UK, US, Saudi Arabia,
          Bahrain, Qatar) and UK Companies House via direct API, plus a best-effort DIFC
          web search — simultaneously. Free. No account required.
        </p>

        {/* Search input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Revolut, Careem, Tabby..."
            className="flex-1 bg-accent border border-border rounded-lg px-4 py-3.5 text-foreground text-sm placeholder:text-faint focus:border-brand/50 outline-none transition-colors"
          />
          <button
            onClick={handleSearch}
            disabled={loading || query.trim().length < 2}
            className="px-6 py-3.5 hs-gradient text-foreground rounded-lg text-sm font-medium hover:bg-[#6d28d9] disabled:opacity-40 transition-colors shrink-0"
          >
            {loading ? "⟳ Searching..." : "Search"}
          </button>
        </div>

        {/* Registries being checked */}
        <div className="flex flex-wrap gap-2 mb-10">
          {["OpenCorporates (140+ jurisdictions)", "UK Companies House", "DIFC (best-effort web search)"].map((r) => (
            <span
              key={r}
              className="text-xs text-faint border border-border px-3 py-1 rounded-full"
              style={{ background: "var(--accent)" }}
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
                className="h-20 rounded-none animate-pulse"
                style={{ background: "var(--accent)" }}
              />
            ))}
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div className="space-y-3">

            {/* Overall verdict */}
            <div
              className="p-5 rounded-lg mb-6"
              style={{
                background: results.verified ? "rgba(16,185,129,0.08)" : "var(--accent)",
                border: results.verified ? "1px solid rgba(16,185,129,0.2)" : "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{results.verified ? "✓" : "○"}</span>
                <p className="text-sm font-semibold text-foreground">
                  {results.verified
                    ? `Registration signal found — ${results.confidence}% confidence`
                    : "No registration found in checked registries"}
                </p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                {results.summary}
              </p>
            </div>

            <p className="text-xs text-faint uppercase tracking-wider mb-3">
              Registry breakdown
            </p>

            {/* OpenCorporates */}
            <div
              className="p-4 rounded-lg"
              style={{
                background: results.opencorporates.found ? "rgba(124,58,237,0.07)" : "var(--accent)",
                border: results.opencorporates.found ? "1px solid rgba(124,58,237,0.2)" : "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-foreground">OpenCorporates</p>
                <span
                  className="text-xs font-semibold"
                  style={{ color: results.opencorporates.found ? "#a78bfa" : "var(--faint)" }}
                >
                  {results.opencorporates.found ? "✓ Found" : "○ Not found"}
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--faint)" }}>
                140+ jurisdictions including UAE, UK, US, Saudi Arabia, Bahrain, Qatar
              </p>
              {results.opencorporates.found && (
                <div className="mt-2 space-y-0.5">
                  {results.opencorporates.jurisdiction && (
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      Jurisdiction: {results.opencorporates.jurisdiction.toUpperCase()}
                    </p>
                  )}
                  {results.opencorporates.status && (
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      Status: {results.opencorporates.status}
                    </p>
                  )}
                  {results.opencorporates.registeredDate && (
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      Incorporated: {results.opencorporates.registeredDate}
                    </p>
                  )}
                  {results.opencorporates.url && (
                    <a
                      href={results.opencorporates.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:underline block mt-1"
                      style={{ color: "var(--brand)" }}
                    >
                      ↗ View on OpenCorporates
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* UK Companies House */}
            <div
              className="p-4 rounded-lg"
              style={{
                background: results.companies_house.found ? "rgba(124,58,237,0.07)" : "var(--accent)",
                border: results.companies_house.found ? "1px solid rgba(124,58,237,0.2)" : "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-foreground">UK Companies House</p>
                <span
                  className="text-xs font-semibold"
                  style={{ color: results.companies_house.found ? "#a78bfa" : "var(--faint)" }}
                >
                  {results.companies_house.found ? "✓ Found" : "○ Not found"}
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--faint)" }}>
                Official UK government company register
              </p>
              {results.companies_house.found && (
                <div className="mt-2 space-y-0.5">
                  {results.companies_house.number && (
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      Company number: {results.companies_house.number}
                    </p>
                  )}
                  {results.companies_house.status && (
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      Status: {results.companies_house.status}
                    </p>
                  )}
                  {results.companies_house.url && (
                    <a
                      href={results.companies_house.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:underline block mt-1"
                      style={{ color: "var(--brand)" }}
                    >
                      ↗ View on Companies House
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* DIFC — always shown as best-effort, never equal to structured checks */}
            <div
              className="p-4 rounded-lg"
              style={{
                background: "var(--accent)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-medium text-foreground">DIFC (UAE)</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(245,158,11,0.7)" }}>
                    Best-effort match — not a direct registry connection
                  </p>
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: results.difc.found ? "#10B981" : "var(--faint)",
                  }}
                >
                  {results.difc.found
                    ? `✓ Match found`
                    : results.difc.status === "no_data_returned" || results.difc.status === "ai_unavailable"
                    ? "— Check attempted"
                    : "○ No match found"}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--faint)" }}>
                AI-assisted search of the DIFC public register page. No direct API access exists.
                {results.difc.confidenceLabel && results.difc.found && (
                  <> Confidence: <strong className="text-muted-foreground">{results.difc.confidenceLabel}</strong>.</>
                )}
              </p>
              {results.difc.found && results.difc.sourceUrl && (
                <a
                  href={results.difc.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:underline block mt-2"
                  style={{ color: "var(--brand)" }}
                >
                  ↗ Verify on difc.ae (check the AI's work)
                </a>
              )}
              {!results.difc.found && (
                <a
                  href="https://www.difc.ae/business/public-register/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:underline block mt-2"
                  style={{ color: "rgba(124,58,237,0.6)" }}
                >
                  ↗ Search manually on difc.ae
                </a>
              )}
            </div>

            {/* Disclaimer */}
            <p className="text-xs mt-4 leading-relaxed" style={{ color: "var(--faint)" }}>
              Results are sourced from public registries and are not manually confirmed. A "not found"
              result does not confirm non-existence — registries may be incomplete or use different
              name formats. Always verify directly with the relevant authority.
            </p>

            {/* CTA */}
            <div
              className="mt-8 p-5 rounded-lg"
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              <p className="text-sm font-semibold text-foreground mb-1">Raising capital?</p>
              <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
                Hockystick automatically runs registry checks on all founder profiles — plus
                LinkedIn verification, AI document review, and investor matching. Free during beta.
              </p>
              <a
                href="/sign-up"
                className="text-xs font-medium px-4 py-2 rounded-lg inline-block transition-colors"
                style={{ background: "var(--gradient-brand)", color: "#fff" }}
              >
                Build your verified profile →
              </a>
            </div>
          </div>
        )}

        {/* Error / no results */}
        {searched && !results && !loading && (
          <div className="text-center py-12">
            <p className="text-faint text-sm">Something went wrong. Try again.</p>
          </div>
        )}

      </main>
      <SiteFooter />
    </div>
  );
}
