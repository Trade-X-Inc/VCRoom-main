import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LcsPageShell,
  LcsNavItem,
  LcsPageHeader,
  LcsTable,
  LcsTableHead,
  LcsTh,
  LcsTableBody,
  LcsTr,
  LcsTd,
  LcsStatusPill,
  LcsEmptyState,
  LcsButton,
  type LcsStatus,
} from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import { getSandboxTransactions, resetSandboxTransactions, daysInStage, STAGE_LABEL, SECTOR_LABEL, INSTRUMENT_LABEL, type LcsTransactionListStatus, type LcsInstrumentType, type LcsViewerRole } from "@/lib/lcs-sandbox";

const VIEWER_ROLE_KEY = "lcs-viewer-role";
/** Matches deals-preview.index.tsx's own hardcoded founder identity —
 * see that file's header comment for why a fixed person rather than an
 * owner-select control. */
const FOUNDER_OWNER = "R. Mehta";

// Transactions hub §2 — filtered list view, 1 Sep 2026. UI only, sandbox
// data only (src/lib/lcs-sandbox.ts — localStorage-backed, zero Supabase
// calls, confirmed by grep; never the real deal_rooms table). Real
// production deal_rooms has exactly 4 rows, all test/adversarial fixtures
// (Playwright Test Co x2, Atlas Robotics) — none are used here, per direct
// instruction.
//
// "Deals" renamed to "Transactions" as UI-facing terminology, 1 Sep 2026 —
// see deals-preview.index.tsx's header comment for the full scope note.
//
// Sector-layer restructure, checkpoint 2 (1 Sep 2026) — renamed from
// deals-preview.$sector.tsx to add the instrument-type param. Route was
// previously /deals-preview/$sector; the sector-only path now resolves
// to the new instrument picker (deals-preview.$sector.index.tsx) instead
// of this list directly. This file's own content is otherwise unchanged
// from before the restructure — same tabs, same table, same columns —
// plus the new instrumentType filter and the "back" target updated to
// point at the instrument picker instead of straight back to the
// sector list.
//
// Real bug found live during this same checkpoint, not by inspection:
// the row-click navigation originally targeted
// /deals-preview/$sector/$dealId (2 segments) — the EXACT same URL
// shape as this page's own route (/deals-preview/$sector/$instrument,
// also 2 segments). TanStack resolved every click to this page's own
// route instead of the transaction detail page (clicking a row just
// reloaded a broken version of this same screen with the transaction id
// misinterpreted as an instrument type). Fixed by adding a third segment
// to the detail route (deals-preview.$sector_.$instrument.$dealId.tsx,
// now /deals-preview/$sector/$instrument/$dealId) so the two routes are
// no longer the same shape — see that file's own header comment for the
// full trace.

export const Route = createFileRoute("/deals-preview/$sector/$instrument")({
  component: SectorTransactions,
});

const TABS: { key: LcsTransactionListStatus; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "in-progress", label: "In Progress" },
  { key: "pending-action", label: "Pending Action" },
  { key: "closed", label: "Closed" },
];

const STATUS_TO_PILL: Record<LcsTransactionListStatus, LcsStatus> = {
  active: "in-progress",
  "in-progress": "in-progress",
  "pending-action": "attention",
  closed: "satisfied",
};

function SectorTransactions() {
  const { sector, instrument } = Route.useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<LcsTransactionListStatus>("active");
  // Real bug found live (not by inspection): initializing this from
  // getSandboxTransactions() directly caused an SSR/client hydration
  // mismatch, same class as this session's earlier /status fix.
  // getSandboxTransactions() reads localStorage, which doesn't exist
  // during SSR (the module falls back to a fresh in-memory seed there)
  // but DOES exist on the client, where it can hold a different value
  // from a prior session — the two renders disagreed and React discarded
  // the SSR tree. Fixed the same way: render a deterministic value on
  // first paint (the seed function's own shape, computed lazily so it's
  // stable across server and client), then swap in the real persisted
  // value only after mount.
  const [transactions, setTransactions] = useState<ReturnType<typeof getSandboxTransactions>>([]);
  const [hydrated, setHydrated] = useState(false);
  const [resetting, setResetting] = useState(false);
  // "Days in stage" depends on Date.now(), which differs between SSR and
  // client hydration by however many ms elapsed between them — same
  // hydration-mismatch class as everything else on this page. Computed
  // once, client-side, after mount, alongside the sandbox data itself.
  const [now, setNow] = useState<number | null>(null);
  // Same localStorage-backed role as deals-preview.index.tsx's switcher
  // — a founder viewer reaches this exact list (redirected here for
  // technology/equity specifically), and the list itself must still
  // filter to only their own transactions. The redirect alone isn't
  // enough: an investor/advisor navigating this same URL directly (or a
  // founder's URL being shared) would otherwise see all 6 transactions
  // regardless of role, which defeats the point of the founder scoping.
  const [role, setRole] = useState<LcsViewerRole | null>(null);

  useEffect(() => {
    setTransactions(getSandboxTransactions());
    setNow(Date.now());
    setHydrated(true);
  }, []);

  // Re-reads on mount AND on VIEWER_ROLE_CHANGE_EVENT, not just once — see
  // deals-preview.index.tsx's checkpoint-3 header comment for the live bug
  // this pattern fixes (a mount-only read goes stale when the switcher is
  // used without a route change, e.g. while already parked on this exact
  // screen watching the owner-filtered list). Split into its own effect
  // from the sandbox-data load above since this one also needs to
  // re-subscribe/unsubscribe the event listener, which a single combined
  // effect couldn't cleanly do without re-running the data load too.
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

  const isTechnology = sector === "technology";
  const instrumentType = instrument as LcsInstrumentType;
  const isFounderView = role === "founder";

  const bySector = useMemo(
    () =>
      transactions.filter(
        (d) =>
          d.sector === sector &&
          d.instrumentType === instrumentType &&
          (!isFounderView || d.owner === FOUNDER_OWNER)
      ),
    [transactions, sector, instrumentType, isFounderView]
  );
  const filtered = useMemo(() => bySector.filter((d) => d.listStatus === tab), [bySector, tab]);
  const counts = useMemo(() => {
    const c: Record<LcsTransactionListStatus, number> = { active: 0, "in-progress": 0, "pending-action": 0, closed: 0 };
    for (const d of bySector) c[d.listStatus]++;
    return c;
  }, [bySector]);

  const handleReset = () => {
    if (resetting) return;
    setResetting(true);
    const fresh = resetSandboxTransactions();
    setTransactions(fresh);
    setResetting(false);
  };

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
          <LcsNavItem to="/deals-preview" label="Documents" collapsed={collapsed} icon="D" />
          <LcsNavItem to="/deals-preview" label="Reporting" collapsed={collapsed} icon="R" />
          {role === "advisor" && (
            <LcsNavItem to="/deals-preview/team" label="Team" collapsed={collapsed} icon="P" />
          )}
          <LcsNavItem to="/deals-preview" label="Settings" collapsed={collapsed} icon="S" />
        </nav>
      )}
    >
      <LcsPageHeader
        title={`${SECTOR_LABEL[sector] ?? sector} · ${INSTRUMENT_LABEL[instrumentType] ?? instrument}`}
        description={
          isTechnology
            ? isFounderView
              ? `Sandbox pipeline — fictional demo data, not live transactions. Showing ${FOUNDER_OWNER}'s transactions only (Founder view).`
              : "Sandbox pipeline — fictional demo data, not live transactions."
            : "This sector is not yet active."
        }
        action={
          isTechnology ? (
            <LcsButton variant="secondary" onClick={handleReset} disabled={resetting}>
              {resetting ? "Resetting…" : "Reset demo data"}
            </LcsButton>
          ) : (
            <Link to="/deals-preview/$sector" params={{ sector }}>
              <LcsButton variant="secondary">Back to {SECTOR_LABEL[sector] ?? sector}</LcsButton>
            </Link>
          )
        }
      />

      {!isTechnology ? (
        <LcsEmptyState
          title="Coming soon"
          text={`No schedule is published for this sector yet.`}
          action={
            <Link to="/deals-preview/$sector" params={{ sector }}>
              <LcsButton variant="text-link">Back to {SECTOR_LABEL[sector] ?? sector}</LcsButton>
            </Link>
          }
        />
      ) : !hydrated ? (
        // Deliberately blank rather than rendering the pre-hydration []
        // state's tab counts/empty-state text — that content is real
        // enough to look final, and showing "0 transactions" for a
        // moment before the real sandbox data loads is the exact
        // "plausible-looking empty state that isn't real" shape
        // CLAUDE.md's §7.4 warns about, even though here it's a genuine
        // race rather than a swallowed error.
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="px-3 h-9 text-[13px] flex items-center gap-1.5 -mb-px"
                style={{
                  fontFamily: "var(--font-lcs-ui)",
                  fontWeight: tab === t.key ? 500 : 400,
                  color: tab === t.key ? "var(--lcs-accent)" : "var(--lcs-ink-muted)",
                  borderBottom: tab === t.key ? "2px solid var(--lcs-accent)" : "2px solid transparent",
                }}
              >
                {t.label}
                <span
                  className="text-[11px] px-1.5"
                  style={{
                    fontFamily: "var(--font-lcs-data)",
                    color: "var(--lcs-ink-muted)",
                    background: "var(--lcs-surface)",
                    borderRadius: "var(--radius-lcs-control)",
                  }}
                >
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <LcsEmptyState text={`No transactions in ${TABS.find((t) => t.key === tab)?.label}.`} />
          ) : (
            <div className="border" style={{ borderColor: "var(--lcs-line)" }}>
              <LcsTable>
                <LcsTableHead>
                  <LcsTh sticky>Company</LcsTh>
                  <LcsTh>Ref</LcsTh>
                  <LcsTh>Counterparty</LcsTh>
                  <LcsTh>Owner</LcsTh>
                  <LcsTh>Stage</LcsTh>
                  <LcsTh numeric>Days in Stage</LcsTh>
                  <LcsTh>Last Activity</LcsTh>
                  <LcsTh>Status</LcsTh>
                </LcsTableHead>
                <LcsTableBody>
                  {filtered.map((d) => (
                    <LcsTr key={d.id} onClick={() => navigate({ to: "/deals-preview/$sector/$instrument/$dealId", params: { sector, instrument, dealId: d.id } })}>
                      <LcsTd sticky>{d.companyName}</LcsTd>
                      <LcsTd mono>{d.ref}</LcsTd>
                      <LcsTd>{d.counterparty}</LcsTd>
                      <LcsTd>{d.owner}</LcsTd>
                      <LcsTd>{STAGE_LABEL[d.stage]}</LcsTd>
                      <LcsTd numeric>{now !== null ? daysInStage(d, now) : ""}</LcsTd>
                      <LcsTd>{d.lastActivity.text}</LcsTd>
                      <LcsTd>
                        <LcsStatusPill status={STATUS_TO_PILL[d.listStatus]} label={TABS.find((t) => t.key === d.listStatus)?.label} />
                      </LcsTd>
                    </LcsTr>
                  ))}
                </LcsTableBody>
              </LcsTable>
            </div>
          )}
        </div>
      )}
    </LcsPageShell>
  );
}
