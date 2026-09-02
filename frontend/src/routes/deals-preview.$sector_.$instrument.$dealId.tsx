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
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import {
  getSandboxTransaction,
  daysInStage,
  STAGE_ORDER,
  STAGE_LABEL,
  sectorLabel,
  CLOSING_GATE_ORDER,
  CLOSING_GATE_LABEL,
  TEAM_MEMBERS,
  type LcsTransactionStage,
  type LcsSandboxTransaction,
  type LcsTransactionListStatus,
  type LcsViewerRole,
  type LcsClosingGate,
} from "@/lib/lcs-sandbox";

const VIEWER_ROLE_KEY = "lcs-viewer-role";

// Transactions hub §3 — single-transaction lifecycle, 1 Sep 2026.
// Checkpoint 1: shell + seven-state stage bar scaffolded.
// Checkpoint 2: NDA gate + Document vault real content.
// Checkpoint 3: Due diligence + Negotiation real content.
// Closing (six gates) stays on the checkpoint-1 placeholder until its
// own checkpoint.
// UI only, sandbox data only (src/lib/lcs-sandbox.ts) — same standard as
// §1/§2: lcs/ primitives only, no backend wiring.
//
// "Deals" renamed to "Transactions" as UI-facing terminology, 1 Sep 2026
// — see deals-preview.index.tsx's header comment for the full scope
// note.
//
// Sector-layer restructure, checkpoint 2 (1 Sep 2026) — renamed from
// deals-preview.$sector_.$dealId.tsx (was /deals-preview/$sector/$dealId)
// to add the instrument segment: /deals-preview/$sector/$instrument/$dealId.
// REAL BUG found live, not by inspection: with the instrument picker's
// route (deals-preview.$sector.$instrument.tsx) also occupying the
// two-dynamic-segment shape /deals-preview/$sector/<x>, this file's old
// path collided with it — TanStack has no way to tell "$instrument" from
// "$dealId" apart from the URL alone, both are just two segments after
// $sector, and it resolved every transaction-detail click to the
// instrument picker instead (rendering "Technology · sbx-1" with the
// sandbox id misinterpreted as an instrument type, "0 transactions"
// everywhere). Adding the $instrument segment here removes the
// ambiguity: the picker is 2 segments, this route is 3. The trailing
// underscore on $sector_ is unchanged and still means what it always
// did — this route opts out of nesting under any $sector.* layout route,
// same as before the restructure.

export const Route = createFileRoute("/deals-preview/$sector_/$instrument/$dealId")({
  component: TransactionLifecycle,
});

const STATUS_TO_PILL: Record<LcsTransactionListStatus, LcsStatus> = {
  active: "in-progress",
  "in-progress": "in-progress",
  "pending-action": "attention",
  closed: "satisfied",
};

function TransactionLifecycle() {
  const { sector, instrument, dealId } = Route.useParams();
  const [transaction, setTransaction] = useState<LcsSandboxTransaction | null | undefined>(undefined);
  const [activeStage, setActiveStage] = useState<LcsTransactionStage>("initiation");
  const [now, setNow] = useState<number | null>(null);
  const [role, setRole] = useState<LcsViewerRole | undefined>(undefined);

  useEffect(() => {
    const t = getSandboxTransaction(dealId);
    setTransaction(t ?? null);
    setActiveStage(t?.stage ?? "initiation");
    setNow(Date.now());
  }, [dealId]);

  // Nav's "Team" entry is Advisor-only — same event-based re-read as
  // every other deals-preview screen; see deals-preview.index.tsx's
  // checkpoint-3 header comment for why a mount-only read isn't enough.
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
          <LcsNavItem to="/deals-preview/requests" label="Requests" collapsed={collapsed} icon="R" />
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
      {transaction === undefined ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : transaction === null ? (
        <LcsEmptyState
          title="Transaction not found"
          text="This transaction doesn't exist in the sandbox — it may have been reset."
          action={
            <Link to="/deals-preview/$sector/$instrument" params={{ sector, instrument }}>
              <LcsButton variant="text-link">Back to {sectorLabel(sector)}</LcsButton>
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

/** Dispatches to real per-stage content — all seven stages now built
 * (checkpoint 2: NDA gate, Document vault; checkpoint 3: Due diligence,
 * Negotiation; Closing built in its own follow-up pass after checkpoint 5,
 * per direct instruction, using the vertical-accordion mobile treatment
 * already speced in the responsive addendum's PRIMITIVES.md). */
function StagePanel({ transaction, stage, now }: { transaction: LcsSandboxTransaction; stage: LcsTransactionStage; now: number | null }) {
  if (stage === "nda_gate") return <NdaGatePanel transaction={transaction} />;
  if (stage === "document_vault") return <DocumentVaultPanel transaction={transaction} />;
  if (stage === "due_diligence") return <DueDiligencePanel transaction={transaction} />;
  if (stage === "negotiation") return <NegotiationPanel transaction={transaction} />;
  if (stage === "closing") return <ClosingPanel transaction={transaction} />;
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
          <LcsTh sticky>Party</LcsTh>
          <LcsTh>Status</LcsTh>
        </LcsTableHead>
        <LcsTableBody>
          <LcsTr>
            <LcsTd sticky>{transaction.owner} (founder)</LcsTd>
            <LcsTd>
              <LcsStatusPill
                status={transaction.nda.founderSignedAt ? "satisfied" : "pending"}
                label={formatSignedAt(transaction.nda.founderSignedAt)}
              />
            </LcsTd>
          </LcsTr>
          <LcsTr>
            <LcsTd sticky>{transaction.counterparty} (investor)</LcsTd>
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
            <LcsTh sticky>Name</LcsTh>
            <LcsTh>Category</LcsTh>
            <LcsTh>Visible to</LcsTh>
          </LcsTableHead>
          <LcsTableBody>
            {transaction.documents.map((doc) => (
              <LcsTr key={doc.id}>
                <LcsTd sticky>{doc.name}</LcsTd>
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
            <LcsTh sticky>Item</LcsTh>
            <LcsTh>Owner</LcsTh>
            <LcsTh>Status</LcsTh>
          </LcsTableHead>
          <LcsTableBody>
            {transaction.diligenceItems.map((item) => (
              <LcsTr key={item.id}>
                <LcsTd sticky>{item.label}</LcsTd>
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
            <LcsTh sticky>Term</LcsTh>
            <LcsTh>Value</LcsTh>
            <LcsTh>Status</LcsTh>
          </LcsTableHead>
          <LcsTableBody>
            {transaction.terms.map((term) => (
              <LcsTr key={term.id}>
                <LcsTd sticky>{term.label}</LcsTd>
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

const CLOSING_STATUS_TO_PILL: Record<"not-started" | "in-progress" | "done", LcsStatus> = {
  "not-started": "pending",
  "in-progress": "in-progress",
  done: "satisfied",
};

const CLOSING_STATUS_LABEL: Record<"not-started" | "in-progress" | "done", string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  done: "Done",
};

/** The gate treated as "current" — the first not-started/in-progress gate
 * in sequence, or the last gate if every gate is done. Matches
 * PRIMITIVES.md's Responsive section exactly: "the gate matching the
 * transaction's actual position (first not-started/in-progress, or the
 * last done if all are complete)". */
function currentClosingGate(gates: Record<LcsClosingGate, "not-started" | "in-progress" | "done">): LcsClosingGate {
  const firstOpen = CLOSING_GATE_ORDER.find((g) => gates[g] !== "done");
  return firstOpen ?? CLOSING_GATE_ORDER[CLOSING_GATE_ORDER.length - 1];
}

/** Gate 1 (Counsel) content — cross-references TEAM_MEMBERS (checkpoint 4's
 * roster) by clientCompanies rather than inventing a separate counsel-
 * assignment field, same no-fabrication discipline as every other real
 * cross-reference in this build (checkpoint 4's client-company counts,
 * checkpoint 5's scheduleCount). "No counsel assigned" is itself a
 * legitimate, real value here — the gate's own definition (lcs-sandbox.ts)
 * is "either party may bring counsel in, or both agree to proceed
 * without," so an unassigned transaction isn't a missing-data gap. */
function CounselGateContent({ transaction }: { transaction: LcsSandboxTransaction }) {
  const assignedCounsel = TEAM_MEMBERS.filter(
    (m) => m.role === "counsel" && m.clientCompanies.includes(transaction.companyName)
  );
  return (
    <div className="p-4" style={{ fontFamily: "var(--font-lcs-ui)" }}>
      {assignedCounsel.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--lcs-ink-muted)" }}>
          No counsel has been brought in for this transaction. Either party may bring counsel in, or both may agree
          to proceed without.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {assignedCounsel.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 border p-3" style={{ borderColor: "var(--lcs-line)" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--lcs-ink)" }}>{m.name}</p>
                <p style={{ fontSize: 12, color: "var(--lcs-ink-muted)" }}>Counsel</p>
              </div>
              <LcsStatusPill status="satisfied" label="Onboarded" />
            </div>
          ))}
        </div>
      )}
      <div className="mt-3">
        <LcsButton variant="secondary">Add counsel</LcsButton>
      </div>
    </div>
  );
}

/** Gates 2-6 have no richer sandbox content than a status today — an
 * honest, minimal factual description of what each gate represents,
 * rather than inventing sub-checklists/documents/payment line items the
 * data model doesn't have. */
const GATE_DESCRIPTION: Record<Exclude<LcsClosingGate, "counsel">, string> = {
  agreement: "The definitive agreement is drafted and circulated for review by both parties.",
  conditions: "Any conditions precedent to closing (regulatory, financing, third-party consents) are satisfied.",
  signing: "Both parties execute the signed agreement.",
  payment: "Funds are transferred per the agreed terms.",
  close: "The transaction is confirmed closed by both parties.",
};

function ClosingGateContent({ transaction, gate }: { transaction: LcsSandboxTransaction; gate: LcsClosingGate }) {
  if (gate === "counsel") return <CounselGateContent transaction={transaction} />;
  const status = transaction.closingGates[gate];
  return (
    <div className="p-4" style={{ fontFamily: "var(--font-lcs-ui)" }}>
      <p style={{ fontSize: 13, color: "var(--lcs-ink-muted)" }}>{GATE_DESCRIPTION[gate]}</p>
      {status !== "done" && (
        <div className="mt-3">
          <LcsButton variant="secondary">
            {status === "not-started" ? `Start ${CLOSING_GATE_LABEL[gate].toLowerCase()}` : "Mark complete"}
          </LcsButton>
        </div>
      )}
    </div>
  );
}

/** Closing — six sequential, mutually-dependent gates, deliberately NOT
 * rendered as a generic comparable-rows table (PRIMITIVES.md's Responsive
 * section explains why at length: the real question is "what's the
 * current gate's state and what's next," not row-to-row comparison).
 *
 * Below `md` (768px): vertical accordion exactly as speced — one row per
 * gate (number, name, StatusPill), current gate auto-expanded, every
 * other gate collapsed, tap to expand one at a time.
 *
 * `md` and above: the addendum explicitly left the desktop layout open,
 * suggesting "a horizontal six-segment progress indicator with the active
 * gate's content below it, following the same expand-current/collapse-
 * others logic sideways" — built here exactly that way, reusing the same
 * segmented-button visual language as the seven-state stage bar above
 * this panel (number + label, current gate underlined) rather than
 * inventing a second progress-indicator style in the same screen. */
function ClosingPanel({ transaction }: { transaction: LcsSandboxTransaction }) {
  const current = currentClosingGate(transaction.closingGates);
  const [openGate, setOpenGate] = useState<LcsClosingGate>(current);

  return (
    <LcsCard title="Closing">
      {/* Desktop: horizontal segmented progress indicator, same visual
          language as the stage bar above (number + label, active segment
          underlined), with the selected gate's content rendered below it.
          Real bug found live at 768px (just above the md breakpoint where
          this becomes visible): six segments each carrying number + label
          + a full StatusPill (per StatusPill's own "dot + label, never
          colour alone" design principle, CLAUDE.md §0 — no compact
          dot-only variant exists or should be invented here) genuinely
          don't fit one row at this width (996px of content in 518px
          available), and the row's default overflow silently clipped
          segments 4-6 rather than making them reachable. `document.
          documentElement.scrollWidth` alone didn't catch it — the clipping
          happened inside the card, not at the page level — caught by
          checking the row's own scrollWidth/clientWidth directly, not
          visual inspection alone. Fixed with the same "horizontal scroll,
          not shrink/clip" pattern the responsive addendum already
          establishes for tables — `overflow-x-auto` on the row itself. */}
      <div className="hidden md:block">
        <div className="flex items-center gap-1 px-3 overflow-x-auto" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
          {CLOSING_GATE_ORDER.map((g, i) => (
            <button
              key={g}
              type="button"
              onClick={() => setOpenGate(g)}
              className="h-10 px-3 text-[13px] flex items-center gap-1.5 -mb-px shrink-0"
              style={{
                fontFamily: "var(--font-lcs-ui)",
                fontWeight: openGate === g ? 500 : 400,
                color: openGate === g ? "var(--lcs-accent)" : "var(--lcs-ink)",
                borderBottom: openGate === g ? "2px solid var(--lcs-accent)" : "2px solid transparent",
              }}
            >
              <span aria-hidden="true" className="text-[10px]" style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink-muted)" }}>
                {i + 1}
              </span>
              {CLOSING_GATE_LABEL[g]}
              <LcsStatusPill status={CLOSING_STATUS_TO_PILL[transaction.closingGates[g]]} label={CLOSING_STATUS_LABEL[transaction.closingGates[g]]} />
            </button>
          ))}
        </div>
        <ClosingGateContent transaction={transaction} gate={openGate} />
      </div>

      {/* Mobile: vertical accordion, one gate expanded at a time. */}
      <div className="md:hidden">
        {CLOSING_GATE_ORDER.map((g, i) => {
          const isOpen = openGate === g;
          return (
            <div key={g} style={{ borderBottom: i < CLOSING_GATE_ORDER.length - 1 ? "1px solid var(--lcs-line)" : undefined }}>
              <button
                type="button"
                onClick={() => setOpenGate(isOpen ? current : g)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 px-3 h-11 text-start"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span aria-hidden="true" className="text-[10px] shrink-0" style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink-muted)" }}>
                    {i + 1}
                  </span>
                  <span className="text-[13px] truncate" style={{ fontFamily: "var(--font-lcs-ui)", fontWeight: isOpen ? 500 : 400, color: "var(--lcs-ink)" }}>
                    {CLOSING_GATE_LABEL[g]}
                  </span>
                </span>
                <LcsStatusPill status={CLOSING_STATUS_TO_PILL[transaction.closingGates[g]]} label={CLOSING_STATUS_LABEL[transaction.closingGates[g]]} />
              </button>
              {isOpen && <ClosingGateContent transaction={transaction} gate={g} />}
            </div>
          );
        })}
      </div>
    </LcsCard>
  );
}
