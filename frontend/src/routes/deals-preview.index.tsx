import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LcsPageShell,
  LcsNavItem,
  LcsPageHeader,
} from "@/components/lcs";

// Transactions hub §1 — sector selector, 1 Sep 2026. UI only, mock/static
// data, no backend wiring (per instruction) — every count below is either
// the real number of published pack_v1.schedule rows for that sector
// (queried live: technology/seed is the only published row, confirmed via
// execute_sql against the real project this session) or explicitly absent
// where no real schedule exists, never a fabricated figure. Same honesty
// standard as the public site's own "no fabricated deal counts" rule.
//
// Route placement: outside /app/* deliberately — see CLAUDE.md's 1 Sep
// 2026 entry. This is temporary placement pending the real shell cutover.
//
// "Deals" was renamed to "Transactions" as UI-facing terminology, 1 Sep
// 2026, per direct instruction. Sidebar label, page titles, and internal
// type/function/variable names updated throughout this route tree; the
// deals-preview URL prefix and $dealId route param are deliberately left
// unrenamed here — they're folded into the upcoming sitemap restructure
// instead of being churned twice.

export const Route = createFileRoute("/deals-preview/")({
  component: TransactionsHub,
});

type Sector = {
  id: string;
  name: string;
  status: "active" | "coming-soon";
  /** Only set when a real published pack_v1.schedule row exists for this
   * sector. Never a placeholder or estimated figure. */
  scheduleCount?: number;
};

const SECTORS: Sector[] = [
  { id: "technology", name: "Technology", status: "active", scheduleCount: 1 },
  { id: "real-estate", name: "Real Estate", status: "coming-soon" },
  { id: "manufacturing", name: "Manufacturing", status: "coming-soon" },
  { id: "spv", name: "SPV", status: "coming-soon" },
  { id: "syndicate-lead", name: "Syndicate Lead", status: "coming-soon" },
];

function TransactionsHub() {
  return (
    <LcsPageShell
      searchPlaceholder="Search transactions, LPs, requests"
      userInitials="RM"
      userLabel="R. Mehta"
      sidebar={(collapsed) => (
        <nav className="flex flex-col gap-0.5 p-2">
          {!collapsed && (
            <div className="px-2 py-2 text-[15px] font-semibold" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>
              Lengdon
            </div>
          )}
          <LcsNavItem to="/deals-preview" label="Home" collapsed={collapsed} icon="H" />
          <LcsNavItem to="/deals-preview" label="Transactions" active collapsed={collapsed} icon="T" />
          <LcsNavItem to="/deals-preview" label="Requests" collapsed={collapsed} icon="R" />
          <LcsNavItem to="/deals-preview" label="Investors" collapsed={collapsed} icon="I" />
          <LcsNavItem to="/deals-preview" label="Documents" collapsed={collapsed} icon="D" />
          <LcsNavItem to="/deals-preview" label="Reporting" collapsed={collapsed} icon="R" />
          <LcsNavItem to="/deals-preview" label="Settings" collapsed={collapsed} icon="S" />
        </nav>
      )}
    >
      <LcsPageHeader
        title="Transactions"
        description="Choose a sector to view its pipeline."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTORS.map((sector) =>
          sector.status === "active" ? (
            <Link
              key={sector.id}
              to="/deals-preview/$sector"
              params={{ sector: sector.id }}
              className="border p-4 flex flex-col gap-2 transition-colors"
              style={{ borderColor: "var(--lcs-line)", fontFamily: "var(--font-lcs-ui)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--lcs-surface)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-semibold" style={{ color: "var(--lcs-ink)" }}>
                  {sector.name}
                </span>
                <span
                  className="text-[11px] px-1.5 py-0.5 shrink-0"
                  style={{
                    fontFamily: "var(--font-lcs-ui)",
                    fontWeight: 500,
                    color: "var(--lcs-progress)",
                    background: "var(--lcs-progress-wash)",
                    borderRadius: "var(--radius-lcs-control)",
                  }}
                >
                  Active
                </span>
              </div>
              <p className="text-[13px]" style={{ color: "var(--lcs-ink-muted)" }}>
                {sector.scheduleCount === 1
                  ? "1 published schedule"
                  : `${sector.scheduleCount ?? 0} published schedules`}
              </p>
            </Link>
          ) : (
            <div
              key={sector.id}
              className="border p-4 flex flex-col gap-2"
              style={{ borderColor: "var(--lcs-line)", fontFamily: "var(--font-lcs-ui)", opacity: 0.6 }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-semibold" style={{ color: "var(--lcs-ink)" }}>
                  {sector.name}
                </span>
                <span
                  className="text-[11px] px-1.5 py-0.5 shrink-0"
                  style={{
                    fontFamily: "var(--font-lcs-ui)",
                    fontWeight: 500,
                    color: "var(--lcs-ink-muted)",
                    background: "var(--lcs-surface)",
                    borderRadius: "var(--radius-lcs-control)",
                  }}
                >
                  Coming soon
                </span>
              </div>
              <p className="text-[13px]" style={{ color: "var(--lcs-ink-muted)" }}>
                No schedule published yet.
              </p>
            </div>
          )
        )}
      </div>
    </LcsPageShell>
  );
}
