import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LcsPageShell, LcsNavItem, LcsPageHeader, LcsEmptyState, LcsButton } from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import { getSandboxTransactions, isSectorActive, sectorLabel, INSTRUMENT_LABEL, type LcsInstrumentType, type LcsViewerRole } from "@/lib/lcs-sandbox";

// Sector-layer restructure, checkpoint 2 (1 Sep 2026) — the instrument-
// type picker inserted between the sector selector (§1) and the
// stage-filtered list (was §2, now $sector.$instrument.tsx). Same
// bordered-card-grid visual pattern as $sector's own sector cards
// (deals-preview.index.tsx) — literally the same layout, different data,
// per the plan reported and approved before this file was written. No
// new LCS primitive needed.
//
// Real counts, not fabricated ones, matching this build's standing
// discipline (§1's own "no fabricated deal counts" rule): every seeded
// transaction is "equity" (§20.1 sandbox note — none of the 6 seed
// transactions represent debt instruments), so Equity's count is real
// and Debt's is genuinely zero, not a placeholder.

export const Route = createFileRoute("/deals-preview/$sector/")({
  component: InstrumentPicker,
});

const INSTRUMENTS: LcsInstrumentType[] = ["equity", "debt"];

const VIEWER_ROLE_KEY = "lcs-viewer-role";

function InstrumentPicker() {
  const { sector } = Route.useParams();
  const [counts, setCounts] = useState<Record<LcsInstrumentType, number> | null>(null);
  const [role, setRole] = useState<LcsViewerRole | undefined>(undefined);

  // Same hydration-safe pattern as every other sandbox-reading screen in
  // this build: localStorage doesn't exist during SSR, so compute counts
  // client-side only, after mount, rather than risking an SSR/client
  // mismatch on first paint.
  useEffect(() => {
    const all = getSandboxTransactions().filter((t) => t.sector === sector);
    const c: Record<LcsInstrumentType, number> = { equity: 0, debt: 0 };
    for (const t of all) c[t.instrumentType]++;
    setCounts(c);
  }, [sector]);

  // Nav's "Team" entry is Advisor-only — see deals-preview.team.tsx's own
  // header comment for why this event-based re-read exists, not just [].
  useEffect(() => {
    const readRole = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(VIEWER_ROLE_KEY);
      } catch {
        /* private window / storage blocked — default to founder */
      }
      setRole(stored === "founder" || stored === "investor" || stored === "advisor" ? stored : "founder");
    };
    readRole();
    window.addEventListener(VIEWER_ROLE_CHANGE_EVENT, readRole);
    return () => window.removeEventListener(VIEWER_ROLE_CHANGE_EVENT, readRole);
  }, []);

  // checkpoint 5 (2 Sep 2026) — reads the shared sector config instead of
  // a hardcoded `sector === "technology"` comparison. See lcs-sandbox.ts's
  // SECTORS/isSectorActive header comment for the full "config, not
  // hardcoded branches" rationale.
  const isActive = isSectorActive(sector);

  return (
    <LcsPageShell
      searchPlaceholder="Search transactions, LPs, requests"
      userInitials="RM"
      userLabel="R. Mehta"
      headerExtra={<RoleSwitcher />}
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
          <LcsNavItem to="/deals-preview/vault" label="Documents" collapsed={collapsed} icon="D" />
          <LcsNavItem to="/deals-preview" label="Reporting" collapsed={collapsed} icon="R" />
          {role === "advisor" && (
            <LcsNavItem to="/deals-preview/team" label="Team" collapsed={collapsed} icon="P" />
          )}
          <LcsNavItem to="/deals-preview" label="Settings" collapsed={collapsed} icon="S" />
        </nav>
      )}
    >
      <LcsPageHeader
        title={sectorLabel(sector)}
        description="Choose an instrument type to view its pipeline."
        action={
          <Link to="/deals-preview">
            <LcsButton variant="secondary">Back to Transactions</LcsButton>
          </Link>
        }
      />

      {!isActive ? (
        <LcsEmptyState
          title="Coming soon"
          text="No schedule is published for this sector yet."
          action={
            <Link to="/deals-preview">
              <LcsButton variant="text-link">Back to Transactions</LcsButton>
            </Link>
          }
        />
      ) : counts === null ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {INSTRUMENTS.map((inst) => (
            <Link
              key={inst}
              to="/deals-preview/$sector/$instrument"
              params={{ sector, instrument: inst }}
              className="border p-4 flex flex-col gap-2 transition-colors"
              style={{ borderColor: "var(--lcs-line)", fontFamily: "var(--font-lcs-ui)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--lcs-surface)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-semibold" style={{ color: "var(--lcs-ink)" }}>
                  {INSTRUMENT_LABEL[inst]}
                </span>
                <span
                  className="text-[11px] px-1.5 py-0.5 shrink-0"
                  style={{
                    fontFamily: "var(--font-lcs-ui)",
                    fontWeight: 500,
                    color: counts[inst] > 0 ? "var(--lcs-progress)" : "var(--lcs-ink-muted)",
                    background: counts[inst] > 0 ? "var(--lcs-progress-wash)" : "var(--lcs-surface)",
                    borderRadius: "var(--radius-lcs-control)",
                  }}
                >
                  {counts[inst]} {counts[inst] === 1 ? "transaction" : "transactions"}
                </span>
              </div>
              <p className="text-[13px]" style={{ color: "var(--lcs-ink-muted)" }}>
                {counts[inst] > 0
                  ? `${counts[inst]} ${counts[inst] === 1 ? "transaction" : "transactions"} in this pipeline.`
                  : "No transactions yet."}
              </p>
            </Link>
          ))}
        </div>
      )}
    </LcsPageShell>
  );
}
