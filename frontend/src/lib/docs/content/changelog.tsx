import type { DocPage } from "../primitives";
import { H2, Lead } from "../primitives";

// Entries are derived from the actual git history of this repository —
// curated for readability, not invented. Grouped by month, newest first.

interface ChangeEntry {
  date: string; // ISO
  area: string; // feature area tag
  text: string;
}

const CHANGELOG: { month: string; entries: ChangeEntry[] }[] = [
  {
    month: "July 2026",
    entries: [
      { date: "2026-07-08", area: "Docs", text: "Documentation site launched at /docs — feature guides, security posture, and this changelog." },
      { date: "2026-07-08", area: "Mobile", text: "Mobile fixes across the app: Document vault now uses a single-column layout with a horizontal category chip row, the AI panel opens full-screen, the sidebar drawer shows labels for every item, sign-in inputs no longer trigger iOS auto-zoom, deal room stage tabs show a scroll fade, and the onboarding tour card stays on screen at any viewport size." },
      { date: "2026-07-08", area: "Onboarding", text: "Founder and investor onboarding rebuilt end to end: guided tour with element spotlighting, profile completion banner, a profile-completeness gate on the AI panel below 40%, and scheduled nudge reminders. Pre-existing accounts were grandfathered automatically." },
      { date: "2026-07-08", area: "Onboarding", text: "Profile completeness is now computed by one shared function everywhere it appears, so the sidebar percentage, banner, and AI gate always agree." },
      { date: "2026-07-07", area: "AI", text: "AI calls now carry an explicit request timeout, so a slow model responds with a clear retry message instead of hanging the panel." },
      { date: "2026-07-01", area: "Intake", text: "Deal intake parser upgraded: run history is persisted and restorable, results panel gained a mailto invite flow, file types are enforced before upload, and image-only documents fall back to vision-model extraction." },
      { date: "2026-07-01", area: "Q&A", text: "Deal room Q&A rebuilt as a structured stage: 10-question limit per room, typed answers (paste disabled), and a printable Q&A report generated on completion and filed into the Information Vault." },
      { date: "2026-07-01", area: "Legal", text: "NDA strengthened: tightened confidentiality and non-circumvention clauses, DIFC governing law, and DIAC arbitration with New York Convention enforcement." },
    ],
  },
  {
    month: "June 2026",
    entries: [
      { date: "2026-06-30", area: "Deal rooms", text: "NDA is now generated from both parties' live profile data, pinned at the top of the Information Vault, and summarized on the room's Overview panel." },
      { date: "2026-06-30", area: "Theme", text: "Dark theme is the default inside the app; the landing page and public pages are always light." },
      { date: "2026-06-30", area: "AI", text: "AI deal brief generation moved into the deal room Overview panel, with startup context wired into the global AI panel." },
      { date: "2026-06-29", area: "Infrastructure", text: "Deploy pipeline hardened for Cloudflare Pages: worker bundle size reduction, explicit fetch-handler export, and config sanitization." },
      { date: "2026-06-23", area: "Deal rooms", text: "Deal room rebuilt around a horizontal stage bar and staged workflow, with a redesigned document request flow." },
      { date: "2026-06-21", area: "Testing", text: "Permanent Playwright end-to-end test infrastructure established with dedicated test accounts, running against the live database." },
      { date: "2026-06-15", area: "Deal rooms", text: "Deal room team assignment — founders can assign specific team members to each room. Financial tool results became downloadable as PDF." },
      { date: "2026-06-14", area: "Platform", text: "Investor discovery, notifications center, settings, public profile pages, financial tools, and team invite system with member profiles and public CV pages shipped in one platform wave." },
    ],
  },
  {
    month: "May 2026",
    entries: [
      { date: "2026-05-28", area: "Platform", text: "Waitlist, feedback, referrals, and directory pages shipped; blog pipeline connected to the CMS." },
      { date: "2026-05-27", area: "Brand", text: "Platform rebranded to Hockystick with a rewritten landing page and an AI onboarding chat for visitors." },
      { date: "2026-05-26", area: "Investors", text: "Watchlist became the backbone of the investor side: due diligence and analysis pages now read from it, AI analysis runs against watchlist companies, and portfolio derives from invested status." },
      { date: "2026-05-25", area: "Collaboration", text: "Team chat rewritten as workspace channels, decoupled from deal rooms. Investor diligence page gained a split layout with a per-company DD checklist." },
      { date: "2026-05-25", area: "Security", text: "Row Level Security policies tightened across messages, deal room members, and investor profiles after end-to-end testing exposed gaps." },
      { date: "2026-05-06", area: "Platform", text: "Company profile, team members, AI advisor, and user management wired to the production database — the transition from prototype to live product." },
      { date: "2026-05-02", area: "Platform", text: "Initial commit. The project began as “Venture Room.”" },
    ],
  },
];

const AREA_COLORS: Record<string, string> = {
  Security: "bg-red-50 text-red-700 border-red-200",
  Legal: "bg-amber-50 text-amber-800 border-amber-200",
  AI: "bg-purple-50 text-purple-700 border-purple-200",
  "Deal rooms": "bg-blue-50 text-blue-700 border-blue-200",
  Investors: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export const CHANGELOG_PAGES: Record<string, DocPage> = {
  changelog: {
    meta: {
      slug: "changelog",
      title: "Changelog",
      description:
        "What changed on Hockystick, month by month — derived from the actual commit history, not a marketing summary.",
      updated: "2026-07-08",
      toc: CHANGELOG.map((m) => ({
        id: m.month.toLowerCase().replace(/\s+/g, "-"),
        label: m.month,
      })),
    },
    Body: () => (
      <>
        <Lead>
          Every entry below is derived from the repository's real commit history. Dates are commit
          dates. Internal-only changes (build tooling, test plumbing) are summarized or omitted.
        </Lead>
        {CHANGELOG.map((m) => (
          <section key={m.month}>
            <H2 id={m.month.toLowerCase().replace(/\s+/g, "-")}>{m.month}</H2>
            <ul className="mb-6 space-y-4">
              {m.entries.map((e, i) => (
                <li key={i} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                  <div className="flex shrink-0 items-start gap-2 sm:w-40">
                    <time dateTime={e.date} className="text-[13px] leading-6 text-gray-500 tabular-nums">
                      {new Date(e.date + "T00:00:00Z").toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        timeZone: "UTC",
                      })}
                    </time>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 ${
                        AREA_COLORS[e.area] ?? "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {e.area}
                    </span>
                  </div>
                  <p className="text-[15px] leading-7 text-gray-700">{e.text}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </>
    ),
  },
};
