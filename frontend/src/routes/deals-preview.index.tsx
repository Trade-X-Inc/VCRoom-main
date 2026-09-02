import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LcsPageShell,
  LcsNavItem,
  LcsPageHeader,
} from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import { SECTORS, type LcsViewerRole } from "@/lib/lcs-sandbox";

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
//
// Sector-layer restructure, checkpoint 3 (1 Sep 2026) — role switcher
// added. Defaults to Founder, persisted to localStorage (client-only,
// same hydration-safe pattern as every sandbox-reading screen in this
// build — the switcher renders with no role selected during SSR/first
// paint, then reads the real persisted value after mount).
//
// Founder is hardcoded to R. Mehta / Technology / Equity, confirmed
// before building: this sandbox has no per-user identity — "R. Mehta"
// and "S. Cole" are just name strings on seeded transactions, not a
// logged-in "self" — so rather than invent an owner-select control, the
// founder view previews as one fixed person. Switching to Founder skips
// both the sector and instrument pickers entirely and redirects straight
// to the stage-filtered list, since a founder's own transactions all
// share one sector/instrument in this sandbox's model. This is a real
// client-side redirect (useNavigate + replace, not a loader-side one —
// the role lives in localStorage, unavailable during a route loader,
// same reason every other sandbox read in this build happens in a
// useEffect) so the URL correctly reflects where the founder actually
// lands, rather than rendering different content at the same URL.
// Investor/Advisor stay on this hub and see the full Sector -> Instrument
// -> Stage hierarchy, unfiltered by owner.
//
// The switcher UI itself (RoleSwitcher, src/components/deals-preview/)
// moved out of this page and into LcsPageShell's headerExtra slot after
// a real gap found live: Founder redirects away from this hub instantly,
// so a switcher that only existed here left Founder mode with no visible
// way back to Investor/Advisor. This file still reads the role directly
// (it needs to, to decide whether to redirect) — RoleSwitcher owns only
// the switching UI and the write side, not every consumer's read.

const VIEWER_ROLE_KEY = "lcs-viewer-role";
const FOUNDER_SECTOR = "technology";
const FOUNDER_INSTRUMENT = "equity";

export const Route = createFileRoute("/deals-preview/")({
  component: TransactionsHub,
});

function TransactionsHub() {
  const navigate = useNavigate();
  // undefined = not yet hydrated (SSR/first paint); real value only after
  // mount, same pattern as every other localStorage read in this build.
  const [role, setRole] = useState<LcsViewerRole | undefined>(undefined);

  // Re-reads on mount AND on VIEWER_ROLE_CHANGE_EVENT, not just `[]`. Found
  // live: switching role via RoleSwitcher *while already on this hub*
  // writes localStorage and replace-navigates to this same route
  // (/deals-preview -> /deals-preview) — a same-href navigation, which
  // neither remounts the component nor changes anything a router-state
  // selector would see, so a mount-only effect (and an earlier attempted
  // fix keyed on router location) both left this file's own `role` state
  // stale, and Founder's redirect never fired from this entry path even
  // though RoleSwitcher's own display and localStorage were already
  // correct. The native `storage` event doesn't help either — it never
  // fires in the same tab that made the write. See RoleSwitcher.tsx's
  // VIEWER_ROLE_CHANGE_EVENT for the actual fix: an explicit same-tab
  // signal, read here as "something changed, go re-check localStorage"
  // rather than trusting any payload on the event itself.
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

  useEffect(() => {
    if (role !== "founder") return;
    navigate({
      to: "/deals-preview/$sector/$instrument",
      params: { sector: FOUNDER_SECTOR, instrument: FOUNDER_INSTRUMENT },
      replace: true,
    });
  }, [role, navigate]);

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
        title="Transactions"
        description="Choose a sector to view its pipeline."
      />

      {role === undefined || role === "founder" ? (
        // Founder redirects away in the effect above — this is the brief
        // gap before that fires (and the "role not yet hydrated" state,
        // which defaults toward the same branch since founder is the
        // default). Deliberately blank rather than flashing the sector
        // grid a founder is about to be redirected away from.
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : (
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
                {sector.scheduleCount === undefined
                  ? "No schedule published yet."
                  : sector.scheduleCount === 1
                    ? "1 published schedule"
                    : `${sector.scheduleCount} published schedules`}
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
      )}
    </LcsPageShell>
  );
}
