import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LcsPageShell,
  LcsNavItem,
  LcsPageHeader,
  LcsStatusPill,
  LcsButton,
  LcsEmptyState,
  LcsCard,
  LcsTable,
  LcsTableHead,
  LcsTh,
  LcsTableBody,
  LcsTr,
  LcsTd,
  type LcsStatus,
} from "@/components/lcs";
import {
  getSandboxTransaction,
  daysInStage,
  STAGE_ORDER,
  STAGE_LABEL,
  SECTOR_LABEL,
  type LcsTransactionStage,
  type LcsSandboxTransaction,
  type LcsTransactionListStatus,
} from "@/lib/lcs-sandbox";

// Transactions hub §3 — single-transaction lifecycle, 1 Sep 2026.
// Checkpoint 1: shell + seven-state stage bar scaffolded.
// Checkpoint 2: NDA gate + Document vault real content.
// Checkpoint 3 (this pass): Due diligence + Negotiation real content.
// Closing (six gates) stays on the checkpoint-1 placeholder until its
// own checkpoint.
// UI only, sandbox data only (src/lib/lcs-sandbox.ts) — same standard as
// §1/§2: lcs/ primitives only, no backend wiring.
//
// "Deals" renamed to "Transactions" as UI-facing terminology, 1 Sep 2026
// — see deals-preview.index.tsx's header comment for the full scope
// note. The route param ($dealId) and the deals-preview URL prefix are
// deliberately left unrenamed — folded into the upcoming sitemap
// restructure instead of being churned twice.

export const Route = createFileRoute("/deals-preview/$sector_/$dealId")({
  component: TransactionLifecycle,
});

const STATUS_TO_PILL: Record<LcsTransactionListStatus, LcsStatus> = {
  active: "in-progress",
  "in-progress": "in-progress",
  "pending-action": "attention",
  closed: "satisfied",
};

function TransactionLifecycle() {
  const { sector, dealId } = Route.useParams();
  const [transaction, setTransaction] = useState<LcsSandboxTransaction | null | undefined>(undefined);
  const [activeStage, setActiveStage] = useState<LcsTransactionStage>("initiation");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const t = getSandboxTransaction(dealId);
    setTransaction(t ?? null);
    setActiveStage(t?.stage ?? "initiation");
    setNow(Date.now());
  }, [dealId]);

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
      {transaction === undefined ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : transaction === null ? (
        <LcsEmptyState
          title="Transaction not found"
          text="This transaction doesn't exist in the sandbox — it may have been reset."
          action={
            <Link to="/deals-preview/$sector" params={{ sector }}>
              <LcsButton variant="text-link">Back to {SECTOR_LABEL[sector] ?? sector}</LcsButton>
            </Link>
          }
        />
      ) : (
        <>
          <LcsPageHeader
            title={
              <span className="flex items-center gap-3">
                <span>{transaction.companyName}</span>
                <span
                  className="text-[13px] font-normal"
                  style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink-muted)" }}
                >
                  {transaction.ref}
                </span>
              </span>
            }
            description={`${transaction.counterparty} · Owner ${transaction.owner}`}
            action={<LcsStatusPill status={STATUS_TO_PILL[transaction.listStatus]} label={transaction.listStatus === "in-progress" ? "In Progress" : transaction.listStatus === "pending-action" ? "Pending Action" : transaction.listStatus === "closed" ? "Closed" : "Active"} />}
          />

          {/* Seven-state stage bar — checkpoint 1's target. Clicking a
              stage switches the content panel below; the transaction's
              real current stage (from stageEnteredAt) is preselected on
              load. */}
          <div className="flex items-center gap-1 mb-6 flex-wrap" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
            {STAGE_ORDER.map((s, i) => {
              const currentIndex = STAGE_ORDER.indexOf(transaction.stage);
              const reached = i <= currentIndex;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveStage(s)}
                  className="px-3 h-9 text-[13px] flex items-center gap-1.5 -mb-px"
                  style={{
                    fontFamily: "var(--font-lcs-ui)",
                    fontWeight: activeStage === s ? 500 : 400,
                    color: activeStage === s ? "var(--lcs-accent)" : reached ? "var(--lcs-ink)" : "var(--lcs-ink-muted)",
                    borderBottom: activeStage === s ? "2px solid var(--lcs-accent)" : "2px solid transparent",
                    opacity: reached ? 1 : 0.55,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="text-[10px]"
                    style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink-muted)" }}
                  >
                    {i + 1}
                  </span>
                  {STAGE_LABEL[s]}
                </button>
              );
            })}
          </div>

          <StagePanel transaction={transaction} stage={activeStage} now={now} />
        </>
      )}
    </LcsPageShell>
  );
}

/** Dispatches to real per-stage content where it's been built (checkpoint 2:
 * NDA gate, Document vault; checkpoint 3: Due diligence, Negotiation);
 * Closing still shows the checkpoint-1 placeholder until its own
 * checkpoint. */
function StagePanel({ transaction, stage, now }: { transaction: LcsSandboxTransaction; stage: LcsTransactionStage; now: number | null }) {
  if (stage === "nda_gate") return <NdaGatePanel transaction={transaction} />;
  if (stage === "document_vault") return <DocumentVaultPanel transaction={transaction} />;
  if (stage === "due_diligence") return <DueDiligencePanel transaction={transaction} />;
  if (stage === "negotiation") return <NegotiationPanel transaction={transaction} />;
  return <StagePlaceholder transaction={transaction} stage={stage} now={now} />;
}

function StagePlaceholder({ transaction, stage, now }: { transaction: LcsSandboxTransaction; stage: LcsTransactionStage; now: number | null }) {
  return (
    <div className="border p-8" style={{ borderColor: "var(--lcs-line)" }}>
      <p style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink-muted)", fontSize: 13 }}>
        {STAGE_LABEL[stage]} — content built in a later checkpoint of this section.
        {stage === transaction.stage && now !== null && (
          <> This transaction has been in this stage for {daysInStage(transaction, now)} days.</>
        )}
      </p>
    </div>
  );
}

function formatSignedAt(iso: string | null): string {
  if (!iso) return "Not yet signed";
  const d = new Date(iso);
  return `Signed ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

/** NDA gate — two-party signature state (founder, investor/counterparty),
 * matching the sandbox's `nda: { founderSignedAt, investorSignedAt }`
 * shape exactly. Both must be signed to advance past this gate — shown as
 * two independent rows rather than a single "signed/unsigned" toggle,
 * since the two parties sign independently and asymmetric state (one
 * signed, one not) is a real, common, and non-error state to represent. */
function NdaGatePanel({ transaction }: { transaction: LcsSandboxTransaction }) {
  const bothSigned = !!transaction.nda.founderSignedAt && !!transaction.nda.investorSignedAt;
  return (
    <LcsCard title="NDA signatures" count={(transaction.nda.founderSignedAt ? 1 : 0) + (transaction.nda.investorSignedAt ? 1 : 0)}>
      <LcsTable>
        <LcsTableHead>
          <LcsTh>Party</LcsTh>
          <LcsTh>Status</LcsTh>
        </LcsTableHead>
        <LcsTableBody>
          <LcsTr>
            <LcsTd>{transaction.owner} (founder)</LcsTd>
            <LcsTd>
              <LcsStatusPill
                status={transaction.nda.founderSignedAt ? "satisfied" : "pending"}
                label={formatSignedAt(transaction.nda.founderSignedAt)}
              />
            </LcsTd>
          </LcsTr>
          <LcsTr>
            <LcsTd>{transaction.counterparty} (investor)</LcsTd>
            <LcsTd>
              <LcsStatusPill
                status={transaction.nda.investorSignedAt ? "satisfied" : "pending"}
                label={formatSignedAt(transaction.nda.investorSignedAt)}
              />
            </LcsTd>
          </LcsTr>
        </LcsTableBody>
      </LcsTable>
      <div className="px-3 py-3 flex items-center justify-between gap-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
        <p style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink-muted)", fontSize: 12 }}>
          {bothSigned
            ? "Both parties have signed. This transaction can proceed to the company profile."
            : "Both parties must sign before this transaction can proceed."}
        </p>
        {!transaction.nda.founderSignedAt && <LcsButton variant="secondary">Sign as founder</LcsButton>}
      </div>
    </LcsCard>
  );
}

/** Document vault — per-document visibility scope, matching the real
 * product's per-document (not per-gate, not per-role-only) model, per
 * lcs-sandbox.ts's own note tracing this to the live deal-room-documents
 * action layer. "Founder-only" documents are visible in this list to
 * both roles in this sandbox (there's no real auth/role switching here),
 * but the scope is shown explicitly via the status pill rather than
 * hidden — so the screen documents the real access model instead of
 * silently simulating enforcement it can't actually perform. */
function DocumentVaultPanel({ transaction }: { transaction: LcsSandboxTransaction }) {
  return (
    <LcsCard title="Documents" count={transaction.documents.length}>
      {transaction.documents.length === 0 ? (
        <LcsEmptyState text="No documents uploaded yet." />
      ) : (
        <LcsTable>
          <LcsTableHead>
            <LcsTh>Name</LcsTh>
            <LcsTh>Category</LcsTh>
            <LcsTh>Visible to</LcsTh>
          </LcsTableHead>
          <LcsTableBody>
            {transaction.documents.map((doc) => (
              <LcsTr key={doc.id}>
                <LcsTd>{doc.name}</LcsTd>
                <LcsTd>{doc.category}</LcsTd>
                <LcsTd>
                  <LcsStatusPill
                    status={doc.visibleTo === "both" ? "satisfied" : "pending"}
                    label={doc.visibleTo === "both" ? "Both parties" : "Founder only"}
                  />
                </LcsTd>
              </LcsTr>
            ))}
          </LcsTableBody>
        </LcsTable>
      )}
      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
        <LcsButton variant="secondary">Upload document</LcsButton>
      </div>
    </LcsCard>
  );
}

/** Due diligence — checklist items, each with a single owner (the party
 * responsible for satisfying it, matching the real product's dd_categories/
 * dd_checklist_items shape in spirit) and a satisfied/outstanding state.
 * Owner is deliberately a single party per item, not a shared checkbox —
 * an item is either the founder's to provide or the investor's to
 * complete (e.g. a reference call), and conflating the two would misstate
 * who's actually blocking progress. Count badge shows outstanding, not
 * total, since "how many are left" is the load-bearing number here. */
function DueDiligencePanel({ transaction }: { transaction: LcsSandboxTransaction }) {
  const outstanding = transaction.diligenceItems.filter((i) => !i.satisfied).length;
  return (
    <LcsCard title="Diligence checklist" count={outstanding}>
      {transaction.diligenceItems.length === 0 ? (
        <LcsEmptyState text="No diligence items requested yet." />
      ) : (
        <LcsTable>
          <LcsTableHead>
            <LcsTh>Item</LcsTh>
            <LcsTh>Owner</LcsTh>
            <LcsTh>Status</LcsTh>
          </LcsTableHead>
          <LcsTableBody>
            {transaction.diligenceItems.map((item) => (
              <LcsTr key={item.id}>
                <LcsTd>{item.label}</LcsTd>
                <LcsTd>{item.owner}</LcsTd>
                <LcsTd>
                  <LcsStatusPill
                    status={item.satisfied ? "satisfied" : "pending"}
                    label={item.satisfied ? "Satisfied" : "Outstanding"}
                  />
                </LcsTd>
              </LcsTr>
            ))}
          </LcsTableBody>
        </LcsTable>
      )}
      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
        <LcsButton variant="secondary">Request item</LcsButton>
      </div>
    </LcsCard>
  );
}

const TERM_STATUS_TO_PILL: Record<"proposed" | "countered" | "accepted", LcsStatus> = {
  proposed: "pending",
  countered: "attention",
  accepted: "satisfied",
};

const TERM_STATUS_LABEL: Record<"proposed" | "countered" | "accepted", string> = {
  proposed: "Proposed",
  countered: "Countered",
  accepted: "Accepted",
};

/** Negotiation — per-term state (proposed/countered/accepted), matching
 * the real product's two-sided ratchet exactly (lcs-sandbox.ts's own
 * note: this is the one part of the fragmented stage-vocabulary landscape
 * CLAUDE.md already documents as genuinely well-built). No aggregate
 * "transaction status" derived here — each term's state stands on its
 * own, same as the real product; a single rolled-up label would invent a
 * summary the underlying model doesn't produce. */
function NegotiationPanel({ transaction }: { transaction: LcsSandboxTransaction }) {
  return (
    <LcsCard title="Terms" count={transaction.terms.length}>
      {transaction.terms.length === 0 ? (
        <LcsEmptyState text="No terms proposed yet." />
      ) : (
        <LcsTable>
          <LcsTableHead>
            <LcsTh>Term</LcsTh>
            <LcsTh>Value</LcsTh>
            <LcsTh>Status</LcsTh>
          </LcsTableHead>
          <LcsTableBody>
            {transaction.terms.map((term) => (
              <LcsTr key={term.id}>
                <LcsTd>{term.label}</LcsTd>
                <LcsTd>{term.value}</LcsTd>
                <LcsTd>
                  <LcsStatusPill status={TERM_STATUS_TO_PILL[term.status]} label={TERM_STATUS_LABEL[term.status]} />
                </LcsTd>
              </LcsTr>
            ))}
          </LcsTableBody>
        </LcsTable>
      )}
      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
        <LcsButton variant="secondary">Propose term</LcsButton>
      </div>
    </LcsCard>
  );
}
