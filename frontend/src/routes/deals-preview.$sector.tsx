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
import { getSandboxTransactions, resetSandboxTransactions, daysInStage, STAGE_LABEL, SECTOR_LABEL, type LcsTransactionListStatus } from "@/lib/lcs-sandbox";

// Transactions hub §2 — filtered list view, 1 Sep 2026. UI only, sandbox
// data only (src/lib/lcs-sandbox.ts — localStorage-backed, zero Supabase
// calls, confirmed by grep; never the real deal_rooms table). Real
// production deal_rooms has exactly 4 rows, all test/adversarial fixtures
// (Playwright Test Co x2, Atlas Robotics) — none are used here, per direct
// instruction.
//
// "Deals" renamed to "Transactions" as UI-facing terminology, 1 Sep 2026 —
// see deals-preview.index.tsx's header comment for the full scope note.

export const Route = createFileRoute("/deals-preview/$sector")({
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
  const { sector } = Route.useParams();
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

  useEffect(() => {
    setTransactions(getSandboxTransactions());
    setNow(Date.now());
    setHydrated(true);
  }, []);

  const isTechnology = sector === "technology";

  const filtered = useMemo(() => transactions.filter((d) => d.listStatus === tab), [transactions, tab]);
  const counts = useMemo(() => {
    const c: Record<LcsTransactionListStatus, number> = { active: 0, "in-progress": 0, "pending-action": 0, closed: 0 };
    for (const d of transactions) c[d.listStatus]++;
    return c;
  }, [transactions]);

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
        title={SECTOR_LABEL[sector] ?? sector}
        description={
          isTechnology
            ? "Sandbox pipeline — fictional demo data, not live transactions."
            : "This sector is not yet active."
        }
        action={
          isTechnology ? (
            <LcsButton variant="secondary" onClick={handleReset} disabled={resetting}>
              {resetting ? "Resetting…" : "Reset demo data"}
            </LcsButton>
          ) : (
            <Link to="/deals-preview">
              <LcsButton variant="secondary">Back to Transactions</LcsButton>
            </Link>
          )
        }
      />

      {!isTechnology ? (
        <LcsEmptyState
          title="Coming soon"
          text={`No schedule is published for this sector yet.`}
          action={
            <Link to="/deals-preview">
              <LcsButton variant="text-link">Back to Transactions</LcsButton>
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
                  <LcsTh>Ref</LcsTh>
                  <LcsTh>Company</LcsTh>
                  <LcsTh>Counterparty</LcsTh>
                  <LcsTh>Owner</LcsTh>
                  <LcsTh>Stage</LcsTh>
                  <LcsTh numeric>Days in Stage</LcsTh>
                  <LcsTh>Last Activity</LcsTh>
                  <LcsTh>Status</LcsTh>
                </LcsTableHead>
                <LcsTableBody>
                  {filtered.map((d) => (
                    <LcsTr key={d.id} onClick={() => navigate({ to: "/deals-preview/$sector/$dealId", params: { sector, dealId: d.id } })}>
                      <LcsTd mono>{d.ref}</LcsTd>
                      <LcsTd>{d.companyName}</LcsTd>
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
