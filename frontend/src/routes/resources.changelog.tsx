import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/resources/Changelog.tsx.
//
// FLAGGED, NOT CHANGED: every entry below (v1.0.0 through v1.4.0,
// specific feature/fix claims like "Room creation flow is now 40%
// faster") is invented — there is no real product changelog behind this
// page, and it is unrelated to this repo's own actual historical record
// (docs/content/changelog.tsx, referenced in CLAUDE.md §19 as a
// carefully-dated, corrected record of real changes). This page
// introduces a second, fabricated changelog. Reproduced verbatim per
// instruction; content-claim correctness explicitly deferred.
//
// The source's second "Notify me" email-capture form is a duplicate of
// the real, functional one already in SiteFooter.tsx (added per
// instruction on the homepage rebuild) — not reproduced as a second
// fake form; replaced with a pointer to the footer's real one, same
// treatment as the blog index page's newsletter section.

export const Route = createFileRoute("/resources/changelog")({
  component: Changelog,
});

const ENTRIES = [
  {
    version: "v1.4.0",
    date: "26 Aug 2026",
    tag: "Major",
    changes: [
      { type: "new", text: "Conditions gate: condition owners can now add sub-conditions with their own named owners." },
      { type: "new", text: "Sealed export now includes structured JSON alongside the signed PDF — both formats in a single download." },
      { type: "new", text: "Observer access role: advisors and agents can join rooms with read-only visibility at any gate." },
      { type: "improved", text: "Audit record now displays full action history in chronological and reverse-chronological views." },
      { type: "improved", text: "Payment confirmation flow now supports multiple proof-of-transfer uploads before founder confirmation." },
      { type: "fixed", text: "Fixed an edge case where conditions assigned to a party that later changed counsel could become unassigned." },
    ],
  },
  {
    version: "v1.3.2",
    date: "14 Aug 2026",
    tag: "Patch",
    changes: [
      { type: "fixed", text: "Resolved a display issue where the audit log timestamps showed local time instead of UTC." },
      { type: "fixed", text: "NDA confirmation UI now correctly reflects per-person status for each named participant." },
      { type: "improved", text: "Room creation flow is now 40% faster — reduced from 12 steps to 7." },
    ],
  },
  {
    version: "v1.3.0",
    date: "08 Aug 2026",
    tag: "Minor",
    changes: [
      { type: "new", text: "Room dashboard: added a gate progress summary visible to both parties at all times." },
      { type: "new", text: "Signing gate now shows a real-time status indicator for each signatory." },
      { type: "improved", text: "Close gate export now includes a machine-readable audit manifest." },
      { type: "improved", text: "Significantly improved load performance for rooms with large document sets." },
    ],
  },
  {
    version: "v1.2.0",
    date: "26 Jul 2026",
    tag: "Minor",
    changes: [
      { type: "new", text: "Data residency: rooms can now be created with UK, EU, or US data residency selected at initialisation." },
      { type: "new", text: "API access for Firm plan: read-only API for pulling room status and audit events into external systems." },
      { type: "improved", text: "Conditions gate: condition status is now visible to both parties simultaneously — no asymmetric visibility." },
    ],
  },
  {
    version: "v1.1.0",
    date: "10 Jul 2026",
    tag: "Minor",
    changes: [
      { type: "new", text: "Introduced the Firm plan: unlimited concurrent rooms, team access management, and permanent record retention." },
      { type: "new", text: "Custom branding for Firm plan: room interfaces can now display your firm's name and mark." },
      { type: "fixed", text: "Agreement gate: edge case where one party's confirmation appeared to both parties simultaneously has been resolved." },
    ],
  },
  {
    version: "v1.0.0",
    date: "01 Jul 2026",
    tag: "Launch",
    changes: [
      { type: "new", text: "Lengdon is live. The six-gate closing sequence — Counsel, Agreement, Conditions, Signing, Payment, Close — is available to all users." },
      { type: "new", text: "Immutable audit record with cryptographic linking is active for all rooms." },
      { type: "new", text: "Per-person NDA enforcement is live." },
      { type: "new", text: "Sealed export at close is available for all completed transactions." },
    ],
  },
];

const TAG_STYLES: Record<string, string> = {
  Major: "bg-[#0a2540] text-white",
  Minor: "border border-[#e6e9ef] text-[#425466]",
  Patch: "border border-[#e6e9ef] text-[#94a3b8]",
  Launch: "bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#8a6f10]",
};

const TYPE_STYLES: Record<string, { dot: string; label: string }> = {
  new: { dot: "bg-emerald-500", label: "New" },
  improved: { dot: "bg-[#0a2540]", label: "Improved" },
  fixed: { dot: "bg-[#94a3b8]", label: "Fixed" },
};

function Changelog() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Resources · Changelog"
          title="WHAT'S"
          titleOutline="NEW."
          subtitle="Every release, documented. We ship when things are ready — not on a schedule."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="max-w-[820px] flex flex-col gap-0">
            {ENTRIES.map((entry, ei) => (
              <div key={entry.version} className={`flex gap-8 ${ei < ENTRIES.length - 1 ? "pb-14 border-b border-[#e6e9ef] mb-14" : ""}`}>
                <div className="w-[160px] shrink-0 pt-1">
                  <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.3px] mb-1">{entry.version}</div>
                  <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px] mb-3">{entry.date}</div>
                  <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className={`inline-block text-[10px] tracking-[1px] uppercase px-2.5 py-1 ${TAG_STYLES[entry.tag]}`}>
                    {entry.tag}
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-3">
                  {entry.changes.map((change, ci) => {
                    const style = TYPE_STYLES[change.type];
                    return (
                      <div key={ci} className="flex items-start gap-3">
                        <div className="flex items-center gap-1.5 pt-1 shrink-0 w-[72px]">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                          <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[11px] text-[#94a3b8] tracking-[0.3px]">{style.label}</span>
                        </div>
                        <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.6] flex-1">{change.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#f8f9fb] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[28px] tracking-[-0.8px] mb-2">
                Get release notifications.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px]">
                We'll notify you when a new version ships. No other email from us.
              </p>
            </div>
            <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px]">
              Subscribe from the footer below.
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
