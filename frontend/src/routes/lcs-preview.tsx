import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  LcsCard,
  LcsEmptyState,
  LcsButton,
  LcsModal,
  LcsTextareaField,
} from "@/components/lcs";

// Verification-only route, 1 Sep 2026 — the "Example Worklist home" screen
// from the approved Lengdon Component System PDF's final section,
// reproduced pixel-for-pixel from its own spec to prove every one of the
// 10 primitives renders correctly before any real screen is built on top
// of them. Deliberately OUTSIDE the /app/* prefix and its auth-gated
// AdminShell/MemberShell layout — nesting under /app would have wrapped
// this new shell inside the old v2 shell, defeating the point of the
// preview. No nav entry, direct-URL-only, same containment as the
// advisor-preview screens (CLAUDE.md §20.15). Not a real product screen —
// delete once Group 1 (Transactions hub) is verified and this has
// served its purpose.
//
// "Deals" renamed to "Transactions" as UI-facing terminology, 1 Sep
// 2026 — this throwaway route's strings updated for consistency only;
// it stays out of scope otherwise since it's already marked for
// deletion above.

export const Route = createFileRoute("/lcs-preview")({
  component: LcsPreview,
});

const TRANSACTIONS = [
  { ref: "TX-2291", transaction: "Northbridge Capital Fund IV", owner: "R. Mehta", status: "pending" as const },
  { ref: "TX-2288", transaction: "Alder Street Growth II", owner: "S. Cole", status: "in-progress" as const },
  { ref: "TX-2260", transaction: "Corvex Special Situations", owner: "S. Cole", status: "attention" as const },
];

const REQUESTS = [
  { ref: "RQ-118", label: "Side letter approval", status: "in-progress" as const },
  { ref: "RQ-114", label: "KYC document refresh", status: "attention" as const },
  { ref: "RQ-109", label: "Capital call notice review", status: "satisfied" as const },
];

function LcsPreview() {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");

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
          <LcsNavItem to="/lcs-preview" label="Home" active collapsed={collapsed} icon="H" />
          <LcsNavItem to="/lcs-preview" label="Transactions" collapsed={collapsed} icon="T" />
          <LcsNavItem to="/lcs-preview" label="Requests" collapsed={collapsed} icon="R" />
          <LcsNavItem to="/lcs-preview" label="Investors" collapsed={collapsed} icon="I" />
          <LcsNavItem to="/lcs-preview" label="Documents" collapsed={collapsed} icon="D" />
          <LcsNavItem to="/lcs-preview" label="Reporting" collapsed={collapsed} icon="R" />
          <LcsNavItem to="/lcs-preview" label="Settings" collapsed={collapsed} icon="S" />
        </nav>
      )}
    >
      <LcsPageHeader
        title="Home"
        description="Transactions, requests, and documents awaiting your action."
      />

      <div className="flex flex-col gap-6">
        <LcsCard title="Transactions in your pipeline" count={TRANSACTIONS.length} onViewAll={() => {}}>
          <LcsTable>
            <LcsTableHead>
              <LcsTh>Ref</LcsTh>
              <LcsTh>Transaction</LcsTh>
              <LcsTh>Owner</LcsTh>
              <LcsTh>Status</LcsTh>
            </LcsTableHead>
            <LcsTableBody>
              {TRANSACTIONS.map((d) => (
                <LcsTr key={d.ref} onClick={() => d.status === "attention" && setDeclineOpen(true)}>
                  <LcsTd mono>{d.ref}</LcsTd>
                  <LcsTd>{d.transaction}</LcsTd>
                  <LcsTd>{d.owner}</LcsTd>
                  <LcsTd>
                    <LcsStatusPill status={d.status} />
                  </LcsTd>
                </LcsTr>
              ))}
            </LcsTableBody>
          </LcsTable>
        </LcsCard>

        <LcsCard title="Requests awaiting you" count={REQUESTS.length} onViewAll={() => {}}>
          <LcsTable>
            <LcsTableBody>
              {REQUESTS.map((r) => (
                <LcsTr key={r.ref}>
                  <LcsTd mono>{r.ref}</LcsTd>
                  <LcsTd>{r.label}</LcsTd>
                  <LcsTd>
                    <div className="flex justify-end">
                      <LcsStatusPill status={r.status} />
                    </div>
                  </LcsTd>
                </LcsTr>
              ))}
            </LcsTableBody>
          </LcsTable>
        </LcsCard>

        <LcsEmptyState title="Overdue documents" text="No documents are overdue right now." />
      </div>

      {declineOpen && (
        <LcsModal
          title="Decline this transaction"
          onClose={() => setDeclineOpen(false)}
          footer={
            <>
              <LcsButton variant="secondary" onClick={() => setDeclineOpen(false)}>
                Cancel
              </LcsButton>
              <LcsButton variant="destructive" onClick={() => setDeclineOpen(false)}>
                Decline transaction
              </LcsButton>
            </>
          }
        >
          <p className="text-[13px]" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink-muted)" }}>
            Northbridge Capital Fund IV — TX-2291
          </p>
          <LcsTextareaField
            label="Reason (required)"
            placeholder="Explain why this transaction is being declined"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </LcsModal>
      )}
    </LcsPageShell>
  );
}
