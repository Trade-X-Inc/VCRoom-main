import { useState, useRef, useEffect } from "react";
import { HelpCircle, X, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTimedAI, AITimeoutError, AI_TIMEOUT_MESSAGE } from "@/hooks/useTimedAI";

// ─── Guide content definitions ────────────────────────────────────────────────

export type PageId =
  | "home"
  | "profile"
  | "documents"
  | "deal-room"
  | "deal-rooms"
  | "investor-home"
  | "investor-startups"
  | "investor-intake"
  | "investor-deal-flow"
  | "investor-analysis"
  | "investor-diligence";

interface GuideContent {
  title: string;
  paragraphs: string[];
  aiSystemContext: string; // injected into the AI as liveContextBlock prefix
}

const GUIDES: Record<PageId, GuideContent> = {
  home: {
    title: "Investor Readiness — Home",
    paragraphs: [
      "This page shows your readiness snapshot: how close your profile is to being investor-ready, in three signals.",
      "Verification checks whether your company is independently traceable — website, LinkedIn, company registry, and email domain. Run it from the Verification card.",
      "Claims show which numbers in your profile (revenue, traction, customer count) have proof documents attached. Unverified claims count against your readiness score even if the number is accurate.",
      "The readiness score combines verification (40%), claim proof rate (30%), and your last investor simulation (30%). You need 70 or above to unlock outreach readiness — the blockers below the score tell you exactly what's holding you back.",
    ],
    aiSystemContext:
      "The user is on /app/home — the Founder Readiness dashboard. It shows three signal cards: Verification (tier1_score/100, requires 60+ to pass), Claims (unverified claims block the gate), and Readiness score (weighted composite, 70+ to pass). The blockers listed are real, fetched live from the database.",
  },
  profile: {
    title: "Company Profile",
    paragraphs: [
      "This is your company's source of truth — the information investors see in deal rooms and on your public profile.",
      "The Claims section lists the key numbers you've stated (revenue, ARR, customer count, traction). Each claim can have a proof document attached. When proof is attached, the AI reads it and confirms or flags a mismatch. Unverified claims appear on your public profile with an amber badge — investors notice this.",
      "The Founder Thesis section at the bottom captures your personal investing thesis and background. It is used by the investor-side AI when analyzing your profile against an investor's stated thesis — fill it out honestly.",
      "Changes here do not automatically re-run verification. After updating key fields like your website or company name, re-run the verification check from the Home page.",
    ],
    aiSystemContext:
      "The user is on /app/profile — the Company Profile page. It has sections for company details (name, stage, sector, website), claims (revenue, ARR, customer count — each can have proof attached), team/cap table, and a founder thesis section. Claims with proof_status 'unverified' show amber badges. AI confirms or flags claims when proof is uploaded.",
  },
  documents: {
    title: "Document Vault",
    paragraphs: [
      "Document Vault stores your fundraising materials organized by category: Pitch Deck, Financials, Legal, Market Research, Team, and Product.",
      "When you upload a file, the AI reads it and assigns a category. If you upload to the wrong tab, a warning appears — you can override it, but the AI logs the mismatch.",
      "The AI Summary button generates a plain-language summary of each document. Investors in a deal room can read these summaries before downloading the full file.",
      "The Investor Simulation at the bottom runs your uploaded documents through a simulated investor review. The score (1-10) and deal-killer feedback feed directly into your Readiness score on the Home page.",
    ],
    aiSystemContext:
      "The user is on /app/documents — the founder's Document Vault. Categories: Pitch Deck, Financials, Legal, Market Research, Team, Product. Each upload triggers AI classification and optionally a summary. The Investor Simulation feature at the bottom scores 1-10 and returns deal-killer feedback. That score feeds the readiness calculation.",
  },
  "deal-room": {
    title: "Deal Room",
    paragraphs: [
      "A deal room is a private, shared space between your team and a specific investor. Everything in it is visible to both sides once the investor accepts.",
      "Document Vault holds the files you share with this investor. Investors can request specific documents — you respond by uploading or sharing a link. Documents track whether the investor has opened them.",
      "Q&A is structured async back-and-forth between you and the investor. Treat it like a formal due diligence thread — answers here are part of your record.",
      "The Workstation (visible to investors as DD Workstation) is where the investor runs thesis alignment scoring on your documents. You see the summary; the detailed scoring is private to the investor. The Review tab is where the investor records their formal decision.",
    ],
    aiSystemContext:
      "The user is in a Deal Room. Tabs: Overview (deal summary, NDA status), Document Vault (files shared with investor, request tracking), Q&A (async investor questions), Workstation/DD (investor's diligence, thesis alignment scoring), Team Chat, Notes, Activity, Meetings, and Review (formal decision). NDA must be signed before the investor can access documents.",
  },
  "deal-rooms": {
    title: "Deal Rooms",
    paragraphs: [
      "This page lists all active deal rooms — one per investor who has accepted your NDA.",
      "Each card shows the investor name, how many documents they have accessed, the last activity date, and whether they have submitted a review decision.",
      "Create a new deal room from here to start the process with a new investor. The investor receives a secure invite link. They sign the NDA before accessing anything.",
    ],
    aiSystemContext:
      "The user is on /app/deal-rooms — the list of all deal rooms. Each room is one investor relationship. Rooms show: investor name, document access count, last activity, and decision status. Founders create rooms here; investors join via invite link and NDA.",
  },
  "investor-home": {
    title: "Investor Home",
    paragraphs: [
      "This is your deal flow dashboard — an AI-first view of your active watchlist, thesis alerts, and deal rooms.",
      "Thesis alerts appear when a company on your watchlist or in your intake batch scores above your thesis match threshold. They are generated automatically when new founders match your stated criteria.",
      "Ask the AI anything about your current deal flow — it has live access to your watchlist counts, recent alerts, and active deal rooms. Use it to prioritize which companies to look at next.",
    ],
    aiSystemContext:
      "The user is on /app/investor — the Investor Home (AI chat interface). The AI has access to their watchlist, thesis alerts, and active deal rooms. It can help prioritize deal flow, surface matches, and draft outreach.",
  },
  "investor-startups": {
    title: "Watchlist",
    paragraphs: [
      "The Watchlist is your private tracker for companies you are actively evaluating.",
      "Status pipeline: Sourcing → Reviewing → Diligence → Passed or Invested or Watching. Move a company through stages as your diligence progresses.",
      "You can add companies manually, bulk-import via CSV, or save companies directly from the Deal Flow discovery feed. The score column shows how well each company matched your thesis at the time you added them.",
    ],
    aiSystemContext:
      "The user is on /app/investor/startups — the Investor Watchlist. Status values: Sourcing, Reviewing, Diligence, Passed, Invested, Watching. Companies can be added manually, via CSV, or from the deal flow feed. Score column = thesis match score at add time.",
  },
  "investor-intake": {
    title: "Intake Parser",
    paragraphs: [
      "Intake Parser extracts structured data from unformatted inbound deal flow — copy-paste your inbox, CSV exports from AngelList or Notion, or any batch of company descriptions.",
      "The AI parses each entry and scores it against your thesis. Scores above your threshold are highlighted as strong fits. Below threshold entries are listed but not promoted.",
      "Review the parsed results before acting. The parser can miss or misread fields — always check the extracted data before adding a company to your watchlist.",
    ],
    aiSystemContext:
      "The user is on /app/investor/intake — the Intake Parser. They paste raw inbound deal flow text or upload CSV. The AI extracts company name, sector, stage, and scores against the investor's thesis. Results are read-only until the investor manually saves to watchlist.",
  },
  "investor-deal-flow": {
    title: "Deal Flow Discovery",
    paragraphs: [
      "Deal Flow shows founder profiles that match your stated investment thesis.",
      "Matches are ranked by thesis alignment score — the AI compares each founder's sector, stage, traction, and claimed metrics against your profile's thesis, sectors, stages, check size, and red flags.",
      "Click a company to see their verified profile. Use the 'Add to watchlist' button to save them for tracking. Click 'Open deal room' to start a formal diligence process.",
    ],
    aiSystemContext:
      "The user is on /app/investor/deal-flow — the thesis-matched deal flow discovery feed. Companies are ranked by AI thesis alignment score. Founders with verified profiles show the Hockystick Checked badge. Investors can add to watchlist or open deal rooms from here.",
  },
  "investor-analysis": {
    title: "Thesis Analysis",
    paragraphs: [
      "Thesis Analysis runs a structured thesis-alignment review on any document — upload a pitch deck, one-pager, or financial summary and the AI scores it against your stated investment thesis.",
      "The analysis returns: overall thesis fit score, sector/stage match, red flags detected, key metrics found, and a recommendation summary.",
      "Results are private to you. Founders do not see this analysis unless you share it with them.",
    ],
    aiSystemContext:
      "The user is on /app/investor/analysis — Thesis Analysis. They upload a document and the AI scores it against their thesis (sectors, stages, check size, red flags, key metrics from their profile). Results are private.",
  },
  "investor-diligence": {
    title: "Due Diligence",
    paragraphs: [
      "Due Diligence shows your active diligence checklist across all companies at the Diligence stage of your watchlist.",
      "Six categories: Financials, Team, Product, References, Market, Legal. Check items off as you complete them. Status per item: pending, in progress, or complete.",
      "The checklist is linked to your watchlist — moving a company back to Reviewing removes it from this view. Moving a company to Passed or Invested closes its checklist.",
    ],
    aiSystemContext:
      "The user is on /app/investor/diligence — the Due Diligence checklist. Linked to watchlist entries with status 'Diligence'. Six categories: Financials, Team, Product, References, Market, Legal. Checklist items have status: pending, in_progress, complete.",
  },
};

// ─── Server function for page AI ─────────────────────────────────────────────

// Inline lightweight call — reuses getAIAdvice, just passes page context
async function askPageAI(opts: {
  pageId: PageId;
  message: string;
  history: Array<{ role: string; content: string }>;
  userId: string;
  liveData?: string;
  startupContext?: Record<string, string | number | undefined>;
}): Promise<string> {
  const guide = GUIDES[opts.pageId];
  const liveContextBlock = [
    `PAGE: ${guide.title}`,
    `PAGE CONTEXT: ${guide.aiSystemContext}`,
    opts.liveData ? `LIVE DATA:\n${opts.liveData}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { getAIAdvice } = await import("@/lib/advisor-fn");
  const result = await getAIAdvice({
    data: {
      userId: opts.userId,
      message: opts.message,
      history: opts.history,
      pageContext: opts.pageId,
      liveContextBlock,
      startupContext: opts.startupContext as any,
    },
  });
  return result.reply;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PageGuide({
  pageId,
  liveData,
  startupContext,
}: {
  pageId: PageId;
  /** Real page-specific data to inject into the AI (readiness score, blockers, etc.) */
  liveData?: string;
  startupContext?: Record<string, string | number | undefined>;
}) {
  const { user } = useAuth();
  const guide = GUIDES[pageId];

  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState("");
  const { isWorking: thinking, stillWorking, run } = useTimedAI();
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [guideExpanded, setGuideExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatOpen) inputRef.current?.focus();
  }, [chatOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, thinking]);

  async function send() {
    const msg = input.trim();
    if (!msg || thinking || !user?.id) return;
    setInput("");
    const userMsg = { role: "user", content: msg };
    setHistory((h) => [...h, userMsg]);
    try {
      const reply = await run(() => askPageAI({
        pageId,
        message: msg,
        history,
        userId: user.id,
        liveData,
        startupContext,
      }));
      setHistory((h) => [...h, { role: "assistant", content: reply }]);
    } catch (err) {
      setHistory((h) => [
        ...h,
        { role: "assistant", content: err instanceof AITimeoutError ? AI_TIMEOUT_MESSAGE : "Something went wrong. Please try again." },
      ]);
    }
  }

  return (
    <>
      {/* Trigger button — top-right of its container, always visible */}
      <button
        onClick={() => setOpen(true)}
        title="How this page works"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "var(--accent)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 12,
          color: "var(--muted-foreground)",
          cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
          transition: "color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--muted-foreground)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--muted-foreground)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        <HelpCircle size={13} />
        How this works
      </button>

      {/* Panel — fixed overlay */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding: 16,
            pointerEvents: "none",
          }}
        >
          {/* Click-away backdrop */}
          <div
            style={{ position: "fixed", inset: 0, pointerEvents: "all" }}
            onClick={() => {
              setOpen(false);
              setChatOpen(false);
            }}
          />

          {/* Panel */}
          <div
            style={{
              position: "relative",
              pointerEvents: "all",
              width: "100%",
              maxWidth: 420,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "80vh",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(124,58,237,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <HelpCircle size={14} style={{ color: "#a78bfa" }} />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--foreground)",
                    fontFamily: "Syne, sans-serif",
                  }}
                >
                  {guide.title}
                </span>
              </div>
              <button
                onClick={() => { setOpen(false); setChatOpen(false); }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--faint)",
                  padding: 4,
                  borderRadius: 4,
                  display: "flex",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: "auto", flexGrow: 1 }}>
              {/* Static guide text */}
              <div style={{ padding: "16px 20px" }}>
                <button
                  onClick={() => setGuideExpanded((v) => !v)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                    marginBottom: guideExpanded ? 12 : 0,
                    color: "var(--muted-foreground)",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontFamily: "Syne, sans-serif",
                  }}
                >
                  {guideExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  How this page works
                </button>
                {guideExpanded && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {guide.paragraphs.map((p, i) => (
                      <p
                        key={i}
                        style={{
                          fontSize: 13,
                          lineHeight: 1.65,
                          color: "var(--muted-foreground)",
                          margin: 0,
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "var(--accent)", margin: "0 20px" }} />

              {/* AI chat section */}
              <div style={{ padding: "14px 20px" }}>
                {!chatOpen ? (
                  <button
                    onClick={() => setChatOpen(true)}
                    style={{
                      width: "100%",
                      background: "rgba(124,58,237,0.08)",
                      border: "1px solid rgba(124,58,237,0.2)",
                      borderRadius: 10,
                      padding: "12px 16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "rgba(124,58,237,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>✦</span>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#a78bfa",
                          marginBottom: 2,
                          fontFamily: "Syne, sans-serif",
                        }}
                      >
                        Ask AI about this page
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--faint)",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        Uses your real data — not generic advice
                      </div>
                    </div>
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Chat header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 12, color: "rgba(124,58,237,0.9)", fontWeight: 600, fontFamily: "Syne, sans-serif" }}>
                        ✦ AI Advisor
                      </span>
                      <span style={{ fontSize: 11, color: "var(--faint)", fontFamily: "DM Sans, sans-serif" }}>
                        — context-aware, same boundary as main advisor
                      </span>
                    </div>

                    {/* Messages */}
                    {history.length === 0 && (
                      <p style={{ fontSize: 12, color: "var(--faint)", margin: 0, fontFamily: "DM Sans, sans-serif", fontStyle: "italic" }}>
                        Ask anything about this page — e.g. "what should I do here?" or "explain my readiness score"
                      </p>
                    )}
                    {history.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          flexDirection: m.role === "user" ? "row-reverse" : "row",
                          gap: 8,
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "85%",
                            padding: "8px 12px",
                            borderRadius: m.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                            background:
                              m.role === "user"
                                ? "rgba(124,58,237,0.18)"
                                : "var(--accent)",
                            border:
                              m.role === "user"
                                ? "1px solid rgba(124,58,237,0.25)"
                                : "1px solid var(--border)",
                            fontSize: 12,
                            lineHeight: 1.6,
                            color: m.role === "user" ? "#d8b4fe" : "var(--muted-foreground)",
                            fontFamily: "DM Sans, sans-serif",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {thinking && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Loader2 size={12} style={{ color: "#a78bfa", animation: "spin 1s linear infinite" }} />
                        <span style={{ fontSize: 11, color: "var(--faint)", fontFamily: "DM Sans, sans-serif" }}>
                          {stillWorking ? "Still working — this may take a moment…" : "Thinking…"}
                        </span>
                      </div>
                    )}
                    <div ref={bottomRef} />

                    {/* Input */}
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 4,
                        background: "var(--accent)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "6px 8px",
                      }}
                    >
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                        placeholder="Ask about this page…"
                        disabled={thinking}
                        style={{
                          flex: 1,
                          background: "none",
                          border: "none",
                          outline: "none",
                          fontSize: 12,
                          color: "var(--foreground)",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      />
                      <button
                        onClick={send}
                        disabled={!input.trim() || thinking}
                        style={{
                          background: input.trim() && !thinking ? "var(--gradient-brand)" : "var(--accent)",
                          border: "none",
                          borderRadius: 7,
                          padding: "4px 8px",
                          cursor: input.trim() && !thinking ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.15s",
                        }}
                      >
                        <Send size={12} style={{ color: input.trim() && !thinking ? "#fff" : "var(--faint)" }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
