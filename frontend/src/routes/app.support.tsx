import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LcsPageHeader, LcsButton, LcsTextField, LcsSelectField, LcsTextareaField,
  LcsTable, LcsTableHead, LcsTh, LcsTableBody, LcsTr, LcsTd, LcsStatusPill, LcsEmptyState,
  type LcsStatus,
} from "@/components/lcs";
import { SupportPreviewBanner } from "@/components/app/SupportPreviewBanner";

export const Route = createFileRoute("/app/support")({
  component: SupportPage,
});

// Preview-only local ticket store — no support_tickets table exists
// anywhere in the schema (confirmed by full-repo grep, 4 Sep 2026, before
// building). Deliberately localStorage, not a real insert, per the
// approved honest-preview treatment. Real backend design (schema, status/
// SLA semantics, RLS, an action-layer path) is its own future step-0 audit,
// not folded into this UI pass — see CLAUDE.md's Group-4 follow-on entry.

const STORAGE_KEY = "lcs-support-tickets-preview-v1";

const CATEGORIES = [
  { value: "deal_room", label: "Deal room" },
  { value: "documents", label: "Documents" },
  { value: "account", label: "Account" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Other" },
];

type Priority = "p1" | "p2" | "p3";

const PRIORITIES: { value: Priority; label: string; helper: string }[] = [
  { value: "p1", label: "P1 — Urgent", helper: "Blocking, can't proceed" },
  { value: "p2", label: "P2 — Time sensitive", helper: "Affecting work, has a workaround" },
  { value: "p3", label: "P3 — Standard", helper: "General question or request" },
];

type TicketStatus = "pending" | "in-progress" | "satisfied" | "attention";

interface Ticket {
  id: string;
  category: string;
  priority: Priority;
  subject: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
}

function loadTickets(): Ticket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Ticket[]) : [];
  } catch {
    return [];
  }
}

function saveTickets(tickets: Ticket[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch {
    // preview-only persistence; a write failure here has no real consequence
  }
}

function priorityLabel(p: Priority) {
  return PRIORITIES.find((x) => x.value === p)?.label ?? p;
}

function categoryLabel(c: string) {
  return CATEGORIES.find((x) => x.value === c)?.label ?? c;
}

function SupportPage() {
  const [tab, setTab] = useState<"submit" | "tickets">("submit");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [priority, setPriority] = useState<Priority>("p2");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setTickets(loadTickets());
  }, []);

  const handleSubmit = () => {
    if (!subject.trim()) return;
    const ticket: Ticket = {
      id: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      category,
      priority,
      subject: subject.trim(),
      description: description.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const next = [ticket, ...tickets];
    setTickets(next);
    saveTickets(next);
    setSubject("");
    setDescription("");
    setSubmitted(true);
    setTab("tickets");
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <LcsPageHeader
        title="Support"
        description="Submit a request or browse tickets you've raised."
      />

      <div className="flex gap-2 mb-6">
        <LcsButton variant={tab === "submit" ? "primary" : "secondary"} onClick={() => setTab("submit")}>
          Submit a ticket
        </LcsButton>
        <LcsButton variant={tab === "tickets" ? "primary" : "secondary"} onClick={() => setTab("tickets")}>
          My tickets{tickets.length > 0 ? ` (${tickets.length})` : ""}
        </LcsButton>
        <div className="ml-auto">
          <Link to="/app/support/feedback">
            <LcsButton variant="secondary">Feedback & credits →</LcsButton>
          </Link>
        </div>
      </div>

      <SupportPreviewBanner text="Ticket submission and status below are a design preview. Tickets are saved only in this browser and nobody on our team receives them yet. For a real issue, use the Feedback form or reach us directly." />

      {tab === "submit" ? (
        <div className="p-6" style={{ border: "1px solid var(--lcs-line)", background: "var(--lcs-white)" }}>
          {submitted && (
            <div className="mb-4 px-3 py-2 text-sm" style={{ background: "var(--lcs-satisfied-wash)", color: "var(--lcs-satisfied)", fontFamily: "var(--font-lcs-ui)" }}>
              Ticket saved to your local preview list.
            </div>
          )}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LcsSelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </LcsSelectField>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>
                  Priority
                </label>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className="flex-1 text-left px-3 py-2 text-xs transition-colors"
                      style={{
                        border: p.value === priority ? "1.5px solid var(--lcs-accent)" : "1px solid var(--lcs-line)",
                        background: p.value === priority ? "var(--lcs-progress-wash)" : "var(--lcs-white)",
                        color: p.value === priority ? "var(--lcs-accent)" : "var(--lcs-ink-muted)",
                        fontFamily: "var(--font-lcs-ui)",
                      }}
                      title={p.helper}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <LcsTextField
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Can't upload a document to my deal room"
            />
            <LcsTextareaField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened, what you expected, and any steps to reproduce."
              rows={5}
            />
            <div>
              <LcsButton variant="primary" onClick={handleSubmit} disabled={!subject.trim()}>
                Submit ticket
              </LcsButton>
            </div>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <LcsEmptyState
          title="No tickets yet"
          text="Tickets you submit will appear here."
          action={<LcsButton variant="secondary" onClick={() => setTab("submit")}>Submit a ticket</LcsButton>}
        />
      ) : (
        <LcsTable>
          <LcsTableHead>
            <LcsTh sticky>Ticket</LcsTh>
            <LcsTh>Category</LcsTh>
            <LcsTh>Priority</LcsTh>
            <LcsTh>Status</LcsTh>
          </LcsTableHead>
          <LcsTableBody>
            {tickets.map((t) => (
              <LcsTr key={t.id}>
                <LcsTd sticky mono>
                  <div className="font-medium" style={{ color: "var(--lcs-ink)" }}>{t.id}</div>
                  <div style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>{t.subject}</div>
                </LcsTd>
                <LcsTd>{categoryLabel(t.category)}</LcsTd>
                <LcsTd>{priorityLabel(t.priority)}</LcsTd>
                <LcsTd>
                  <LcsStatusPill status={t.status as LcsStatus} />
                </LcsTd>
              </LcsTr>
            ))}
          </LcsTableBody>
        </LcsTable>
      )}
    </div>
  );
}
