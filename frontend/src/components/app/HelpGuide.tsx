import { useState } from "react";
import { ChevronDown, Link as LinkIcon } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Link } from "@tanstack/react-router";

/* ─── Shared primitives ─────────────────────────────────────────────────── */

function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-none border border-border/60 overflow-hidden mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/50 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown
          className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <div className="bg-background px-4 py-5 space-y-6 border-t border-border/60">
          {children}
        </div>
      )}
    </div>
  );
}

function Article({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2">{heading}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground leading-[1.7]">{children}</p>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2 mt-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span
            className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-foreground shrink-0 mt-0.5"
            style={{ background: "var(--gradient-brand)", minWidth: "20px" }}
          >
            {i + 1}
          </span>
          <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg px-4 py-3 text-sm leading-relaxed mt-2"
      style={{
        background: "rgba(124,58,237,0.07)",
        border: "1px solid rgba(124,58,237,0.18)",
        color: "rgba(168,85,247,0.95)",
      }}
    >
      <span className="font-semibold mr-1" style={{ color: "#A855F7" }}>Tip:</span>
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg px-4 py-3 text-sm leading-relaxed mt-2 border border-border/60 bg-accent/40 text-muted-foreground">
      <span className="font-semibold text-foreground mr-1">Note:</span>
      {children}
    </div>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div className="py-3 border-b border-border/40 last:border-0">
      <p className="text-sm font-semibold text-foreground mb-1">{q}</p>
      <p className="text-sm text-muted-foreground leading-[1.7]">{a}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOUNDER HELP GUIDE
═══════════════════════════════════════════════════════════════════════════ */
export function FounderHelpGuide() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">How to use Hockystick</h2>
        <p className="text-sm text-muted-foreground">Everything you need to run your fundraising process on the platform.</p>
      </div>

      {/* Section 1 — Getting started */}
      <Accordion title="Getting started" defaultOpen>
        <Article heading="How to set up your profile in 10 minutes">
          <Steps items={[
            "Go to Profile in the sidebar → fill in Company name, tagline, website, sector, stage",
            "Upload your logo (optional but improves first impressions with investors)",
            "Go to Documents → upload your pitch deck first — investors open it first",
            "Add your financial model — burn rate, runway, revenue projections",
            "Complete your team section — name, title, LinkedIn for each co-founder",
            "Check your Overview page — it shows your profile completeness percentage and what's still missing",
          ]} />
          <Tip>
            You do not need everything perfect before going live. Upload, improve as you go — the Overview page's checklist always shows what's next.
          </Tip>
        </Article>

        <Article heading="Going live — completing your raise checklist">
          <Body>
            Your Prepare checklist tracks Profile, Documents, Verification, Claims, Readiness, and Badges as you complete each one. The Overview page shows which section is next.
          </Body>
        </Article>
      </Accordion>

      {/* Section 2 — Deal rooms */}
      <Accordion title="Deal rooms">
        <Article heading="Creating and sharing your deal room">
          <Steps items={[
            "Go to Deal Rooms → click \"Create new deal room\"",
            "The room is created with your active documents automatically",
            "Share the link — investors land on your public profile and request access",
            "Or invite directly by email — they bypass the request step",
            "You receive a notification when an investor views your room",
          ]} />
        </Article>

        <Article heading="Understanding deal room analytics">
          <Body>
            For each investor: total time spent, documents viewed, time per document, and visit history — tracked automatically as they browse your deal room.
          </Body>
        </Article>
      </Accordion>

      {/* Section 3 — Profile completeness */}
      <Accordion title="Profile completeness">
        <Article heading="Tracking what's left to complete">
          <Body>
            Your Overview page shows a completeness percentage and a checklist across Profile, Documents, Verification, Claims, Readiness, and Badges. Each section shows complete, in progress, or not started — the checklist always points to what's next.
          </Body>
        </Article>

        <Article heading="Rejection feedback">
          <Body>
            When an investor passes on your deal room with a reason, Hockystick generates a debrief for your team — what the investor was looking for and what to address before approaching a similar investor.
          </Body>
        </Article>
      </Accordion>

      {/* Section 4 — Connections */}
      <Accordion title="Connections">
        <Article heading="Responding to investor requests">
          <Body>
            The Connections page lists incoming requests from investors who want to connect with your startup. Review each request, then approve or decline. Approving creates a deal room with that investor — you'll see a confirmation before it's created.
          </Body>
        </Article>
      </Accordion>

      {/* Section 5 — Team workspace */}
      <Accordion title="Team workspace">
        <Article heading="Inviting team members">
          <Body>
            Go to Admin → Team → Invite member. Team members can: view and upload documents, access deal rooms, use the team workspace (chat, tasks, notes). Team members cannot: change company settings, delete the account, or access financial documents unless you grant deal room access explicitly.
          </Body>
        </Article>

        <Article heading="Using Team Chat, Tasks, and Notes">
          <div className="space-y-2 mt-1">
            {[
              { label: "Team Chat → General", desc: "Message your whole team in real time." },
              { label: "Tasks", desc: "Assign work with priority levels and due dates. Drag between Todo / In Progress / Review / Done." },
              { label: "Notes", desc: "Shared notes for the whole team. Pin important ones to keep them visible." },
              { label: "Activity", desc: "See everything your team and investors have done in the platform — document uploads, deal room views, decisions." },
            ].map(({ label, desc }) => (
              <div key={label} className="flex gap-3 py-2 border-b border-border/40 last:border-0">
                <span className="text-xs font-semibold text-brand shrink-0 pt-0.5 whitespace-nowrap">{label}:</span>
                <span className="text-sm text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </Article>
      </Accordion>

      {/* Section 6 — Common questions */}
      <Accordion title="Common questions">
        <QA
          q="Can investors download my documents?"
          a="Not by default. Document downloads are disabled unless you explicitly enable them per investor in deal room settings."
        />
        <QA
          q="Can I see who has viewed my profile?"
          a="Yes — your Overview and Deal Room pages show investor activity. You see time spent, documents opened, and visit history."
        />
        <QA
          q="What happens when an investor passes?"
          a="You receive a notification. If the investor provided a reason, it appears in your Coaching section with a structured debrief — what to fix before your next investor approach."
        />
        <QA
          q="Is my financial data secure?"
          a="Financial documents are encrypted in your vault. Even Hockystick admins lose access after a deal closes. Investors in a deal room can view but not download documents by default."
        />
        <QA
          q="How do I delete my account?"
          a="Settings → Security → Delete account. This permanently removes your profile, deal rooms, and all associated data. This cannot be undone."
        />
      </Accordion>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INVESTOR HELP GUIDE
═══════════════════════════════════════════════════════════════════════════ */
export function InvestorHelpGuide() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">How to use Hockystick</h2>
        <p className="text-sm text-muted-foreground">Everything you need to run your deal flow process on the platform.</p>
      </div>

      {/* Section 1 — Getting started */}
      <Accordion title="Getting started" defaultOpen>
        <Article heading="Setting up your investment thesis">
          <Body>
            Go to Profile → set your sectors, stages, geography, and check size. Hockystick runs daily thesis matching — founders who match your criteria appear in your discovery feed. The more specific your thesis, the better your matches.
          </Body>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg px-3 py-2.5 text-sm bg-accent/40 border border-border/40 text-muted-foreground">
              <span className="block text-foreground font-medium mb-0.5 text-xs uppercase tracking-wide">Too broad</span>
              "Tech" as a sector returns everything.
            </div>
            <div className="rounded-lg px-3 py-2.5 text-sm border border-brand/20 text-muted-foreground" style={{ background: "rgba(124,58,237,0.06)" }}>
              <span className="block font-medium mb-0.5 text-xs uppercase tracking-wide" style={{ color: "#A855F7" }}>Better</span>
              "B2B SaaS, Seed stage, $500K cheque" returns founders who are a genuine fit.
            </div>
          </div>
        </Article>

        <Article heading="How the deal flow works">
          <Steps items={[
            "Discovery feed shows verified founders matched to your thesis",
            "Click a founder — see their public profile + verification status",
            "Request access — founder approves (or declines)",
            "Approved: you get access to their initial data pack",
            "Invite to deal room — full documents, DD checklist, NDA",
            "Submit Invest / Hold / Pass — with a reason for Pass decisions",
          ]} />
          <Note>
            No cold emails. No intermediaries. The founder knows who you are before they approve access.
          </Note>
        </Article>
      </Accordion>

      {/* Section 3 — Due Diligence */}
      <Accordion title="Due Diligence">
        <Article heading="Using the DD workstation">
          <Body>
            Each deal room has a DD checklist with 23 standard items. The AI pre-fills what it can from uploaded documents — you verify the rest.
          </Body>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["Financials", "Team", "Legal", "Market", "Product", "References"].map((cat) => (
              <span key={cat} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-foreground border border-border/40">
                {cat}
              </span>
            ))}
          </div>
          <Body>
            Progress is tracked per deal room. 0/23 → 23/23 as you work through it.
          </Body>
        </Article>

        <Article heading="What the AI Analysis does">
          <Body>
            Select a company from your watchlist → click "Run analysis". Output: thesis match score, strengths, risks, mitigants, and recommended next action. If the company has a deal room: you also get a full investment memo generated from the uploaded documents.
          </Body>
          <Note>
            The analysis does not replace your judgment — it surfaces what to look at first.
          </Note>
        </Article>
      </Accordion>

      {/* Section 4 — Decisions and Pipeline */}
      <Accordion title="Decisions and Pipeline">
        <Article heading="The Decision Board">
          <Body>
            Table view of all your active deals by default, with a Kanban view available via the toggle. Move deals between stages to update pipeline status.
          </Body>
          <div className="mt-2 flex flex-wrap gap-1.5 mb-2">
            {["Sourcing", "→", "Reviewing", "→", "Meeting", "→", "Diligence", "→", "Term Sheet", "→", "Decision", "→", "Invested", "/", "Passed"].map((s, i) => (
              s === "→" || s === "/" ? (
                <span key={i} className="text-muted-foreground/50 text-sm self-center">{s}</span>
              ) : (
                <span key={s} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-foreground border border-border/40">
                  {s}
                </span>
              )
            ))}
          </div>
          <Body>
            Each card shows time in stage, DD progress, and thesis match score. Filter by sector, stage, or "Stale only" — deals with no activity in 7+ days.
          </Body>
        </Article>

        <Article heading="Submitting Invest / Hold / Pass">
          <div className="space-y-2 mt-1">
            {[
              { v: "Invest", color: "#10B981", bg: "rgba(16,185,129,0.08)", desc: "Marks the deal as committed." },
              { v: "Hold", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", desc: "Sets a follow-up date. Deal stays active in your pipeline." },
              { v: "Pass", color: "#EF4444", bg: "rgba(239,68,68,0.08)", desc: "Requires a reason category. The reason is shared with the founder as structured feedback — not your internal notes." },
            ].map(({ v, color, bg, desc }) => (
              <div key={v} className="flex gap-3 rounded-lg px-3 py-2.5" style={{ background: bg, border: `1px solid ${color}20` }}>
                <span className="text-sm font-semibold shrink-0" style={{ color }}>{v}</span>
                <span className="text-sm text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </Article>

        <Article heading="Negotiating terms">
          <Body>
            Each deal room has a Term Sheet tab for structured negotiation. Propose a term, and the other party can accept, reject, or counter it. Choose from standard instrument templates or add custom terms. A closing panel tracks progress once terms are agreed.
          </Body>
        </Article>
      </Accordion>

      {/* Section 5 — Common questions */}
      <Accordion title="Common questions">
        <QA
          q="Can founders see my internal notes?"
          a="No. Your internal DD notes and pipeline notes stay private. Only your Pass reason (which you select from categories) is shared with founders."
        />
        <QA
          q="How does thesis matching work?"
          a="Daily matching compares new founder profiles against your stated thesis (sectors, stages, geography, check size). Match scores appear on every founder card. You get an email when new high-match founders join."
        />
      </Accordion>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ABOUT SECTION (shared)
═══════════════════════════════════════════════════════════════════════════ */
export function AboutSection() {
  return (
    <div>
      <div className="mb-8">
        <Logo size="lg" />
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-3">About Hockystick</h2>
        <p className="text-sm text-muted-foreground leading-[1.7] max-w-xl">
          Hockystick is a private fundraising platform for early-stage founders and investors.
          We built it because the warm intro system is broken — and most alternatives weren't designed for how deals actually get done.
        </p>
      </div>

      {/* Two-col info grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-none border border-border/60 bg-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Platform</h3>
          <div className="space-y-2.5">
            {[
              { label: "Version", value: "v2.0 (Beta)" },
              { label: "Built by", value: "Venture Tech LLC" },
              { label: "Location", value: "Global" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
                <span className="text-sm text-foreground font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-none border border-border/60 bg-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Contact</h3>
          <div className="space-y-2.5">
            {[
              { label: "Support", href: "mailto:support@hockystick.app", text: "support@hockystick.app" },
              { label: "Press", href: "mailto:press@hockystick.app", text: "press@hockystick.app" },
              { label: "LinkedIn", href: "https://linkedin.com/company/hockystick", text: "linkedin.com/company/hockystick" },
            ].map(({ label, href, text }) => (
              <div key={label} className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
                <a
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="text-sm text-brand hover:text-brand/80 transition-colors"
                  data-testid={label === "Support" ? "support-email-link" : undefined}
                >
                  {text}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legal links */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 border-t border-border/60 pt-6">
        {[
          { label: "Privacy Policy", to: "/privacy" },
          { label: "Terms of Service", to: "/terms" },
          { label: "Cookie Policy", to: "/cookies" },
        ].map(({ label, to }) => (
          <Link
            key={label}
            to={to as any}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} Hockystick. All rights reserved.
      </p>
    </div>
  );
}
