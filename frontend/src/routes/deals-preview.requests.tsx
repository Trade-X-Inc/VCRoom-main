import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LcsPageShell, LcsNavItem, LcsPageHeader, LcsButton, LcsEmptyState } from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import {
  getConnectionRequests,
  approveConnectionRequestSandbox,
  declineConnectionRequestSandbox,
  getSandboxCompany,
  type LcsConnectionRequest,
  type LcsViewerRole,
} from "@/lib/lcs-sandbox";

// Connection Requests — real screen extraction (2 Sep 2026). Source:
// app.connections.tsx (founder-facing incoming requests) + lib/
// connection-request-fn.ts. Confirmed clean by the research pass — no
// discovery-layer residue in either real file. Real fields ported
// verbatim (investor name, fund, thesis one-liner, message, relative
// age); real mechanics ported verbatim (approve is CONFIRM-FIRST with
// the real confirmation copy, decline is immediate with the real
// deliberately-generic investor-facing message).
//
// Approving creates a real transaction (this sandbox's equivalent of the
// real deal_rooms INSERT) and navigates to it — same as the real page's
// own navigate({ to: "/app/deal-rooms/$id" }) after approval. Founder-
// only, per the real product (this is app.connections.tsx, not
// app.investor.connections.tsx — the investor side is a CRM pipeline
// over investor_watchlist, an unrelated screen not in scope here).

const VIEWER_ROLE_KEY = "lcs-viewer-role";

export const Route = createFileRoute("/deals-preview/requests")({
  component: ConnectionRequests,
});

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function ConnectionRequests() {
  const navigate = useNavigate();
  const [role, setRole] = useState<LcsViewerRole | undefined>(undefined);
  const [requests, setRequests] = useState<LcsConnectionRequest[] | null>(null);
  const [hasCompany, setHasCompany] = useState<boolean | undefined>(undefined);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

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
    setRequests(getConnectionRequests());
    setHasCompany(!!getSandboxCompany());
  }, []);

  const pending = (requests ?? []).filter((r) => r.status === "pending");

  const handleApprove = (id: string) => {
    setActingId(id);
    const result = approveConnectionRequestSandbox(id);
    setActingId(null);
    setConfirmId(null);
    if (result.ok) {
      setRequests(getConnectionRequests());
      navigate({
        to: "/deals-preview/$sector/$instrument/$dealId",
        params: { sector: result.sector, instrument: result.instrumentType, dealId: result.dealRoomId },
      });
    }
  };

  const handleDecline = (id: string) => {
    setActingId(id);
    declineConnectionRequestSandbox(id);
    setRequests(getConnectionRequests());
    setActingId(null);
  };

  const isFounder = role === "founder";

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
          <LcsNavItem to="/deals-preview" label="Transactions" collapsed={collapsed} icon="T" />
          <LcsNavItem to="/deals-preview/requests" label="Requests" active collapsed={collapsed} icon="R" />
          {role === "founder" && (
            <LcsNavItem to="/deals-preview/profile" label="Profile" collapsed={collapsed} icon="C" />
          )}
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
      <LcsPageHeader title="Connection requests" description="Investors who want to connect with your company." />
      {role === undefined || requests === null || hasCompany === undefined ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : !isFounder ? (
        <p className="text-[13px]" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
          Connection requests are only available in Founder view. Switch roles above to view it.
        </p>
      ) : !hasCompany ? (
        <div className="border border-dashed p-6 text-center" style={{ borderColor: "var(--lcs-line)" }}>
          <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink-muted)" }}>Build your profile first to receive connection requests.</p>
        </div>
      ) : pending.length === 0 ? (
        <LcsEmptyState text="No connection requests." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {pending.map((r) => {
            const thesis = [r.sectors, r.stages, r.checkSizeMin ? `$${r.checkSizeMin}${r.checkSizeMax ? `–$${r.checkSizeMax}` : "+"}` : null].filter(Boolean).join(" · ");
            return (
              <div key={r.id} className="border p-4" style={{ borderColor: "var(--lcs-line)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, fontWeight: 500, color: "var(--lcs-ink)" }}>
                      {r.investorName}
                      {r.fundName && <span style={{ fontWeight: 400, color: "var(--lcs-ink-muted)" }}> · {r.fundName}</span>}
                    </p>
                    {thesis && (
                      <p className="mt-0.5" style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-ink-muted)" }}>
                        {thesis}
                      </p>
                    )}
                    {r.message && (
                      <p
                        className="mt-2 px-3 py-2"
                        style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-ink)", background: "var(--lcs-progress-wash)", border: "1px solid var(--lcs-line)" }}
                      >
                        "{r.message}"
                      </p>
                    )}
                  </div>
                  <span style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 11, color: "var(--lcs-ink-muted)", whiteSpace: "nowrap" }}>{daysAgo(r.createdAt)}</span>
                </div>

                {confirmId === r.id ? (
                  <div className="mt-3 px-3 py-3" style={{ background: "var(--lcs-progress-wash)", border: "1px solid var(--lcs-line)" }}>
                    <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-ink)" }}>
                      This will create a deal room with <span style={{ fontWeight: 500 }}>{r.investorName}</span>. They'll be notified immediately and can view your Information Vault after signing the NDA. Proceed?
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <LcsButton variant="primary" onClick={() => handleApprove(r.id)} disabled={actingId === r.id}>
                        Confirm
                      </LcsButton>
                      <LcsButton variant="secondary" onClick={() => setConfirmId(null)} disabled={actingId === r.id}>
                        Cancel
                      </LcsButton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2">
                    <LcsButton variant="primary" onClick={() => setConfirmId(r.id)} disabled={!!actingId}>
                      Open deal room
                    </LcsButton>
                    <LcsButton variant="text-link" onClick={() => handleDecline(r.id)} disabled={!!actingId}>
                      {actingId === r.id ? "…" : "Decline"}
                    </LcsButton>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </LcsPageShell>
  );
}
