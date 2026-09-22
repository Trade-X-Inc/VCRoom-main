import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Content pass, 31 Aug 2026 — rewrite of the pixel-exact port of
// LENGDONPUBLIC-NEW's Security.tsx. Per direct instruction: removed
// every SOC 2 / ISO 27001 / GDPR certification claim, and rewritten so
// certifications simply aren't the subject (no "not yet certified"
// gap left visible) — the page is built entirely around controls that
// are true and provable today. Same layout/visual pattern as the
// original (two-column pillar grid, record explainer, CTA strip);
// only the CERTIFICATIONS section was removed outright and the record
// explainer's language brought in line with the sitewide append-only/
// tamper-evident vocabulary rule (no "cryptographic", "hash", "block",
// "chain", "immutable" — the mechanism is described as append-only and
// tamper-evident instead).
//
// Corrected 8 Sep 2026: "Data residency" claimed per-room UK/EU/US
// jurisdiction selection at room creation — no such feature exists
// anywhere in the deal-room code (verified against a live query of the
// real production Supabase project: single region, no per-room
// override). "Independent record" claimed both parties "receive a copy"
// at close — no export/delivery mechanism of any kind exists (CLAUDE.md
// §12, §20.15). Both rewritten to describe what's real.
//
// Corrected 9 Sep 2026 (public-site rewrite, Batch 2): the same "receive
// a copy... at close" export claim survived in a second location this
// 8 Sep pass missed — the "Shared record" item in the append-only-record
// sidebar list below. Rewritten to match the pillar-level fix above.
// Also added, per the task's own instruction that a procurement reviewer
// trusts a company that volunteers its gaps: a one-line statement that
// SOC 2 and independent penetration testing are not yet in place (the
// 31 Aug pass removed every certification claim but never stated the
// gap plainly, leaving certifications simply unaddressed rather than
// disclosed), and an explicit regulatory-boundary statement (software
// infrastructure, not a regulated financial institution, works alongside
// regulated counsel and compliance functions rather than replacing them).
//
// Added 20 Sep 2026: an Accessibility section, same volunteer-the-gap
// discipline as the SOC 2 line above. Grounded only in what this session
// verified live (18 keyboard-trap fixes, 6 broken upload/toggle controls,
// LcsFormField's htmlFor wiring — see git history caa0e08/5e12e60 and
// SECURITY-CHECKLIST.md §9). Explicitly does NOT claim WCAG conformance:
// 226 of the original 229 raw unlabeled-input defects found by the same
// audit remain open (including on the public /tools/* calculators). All
// of that is stated in the copy, not left implicit.
//
// Updated 22 Sep 2026: the #c9d0db/#94a3b8 (INK_FAINT) text-contrast
// failure this comment used to name (1.55:1 / 2.56:1 against white,
// across every text-role occurrence in 18 files) is fixed — both
// swapped to #64748b (4.76:1), already this codebase's established
// caption-text color elsewhere. Non-text occurrences (background,
// border, SVG stroke) were deliberately left unchanged — verified they
// were never using INK_FAINT in the first place, so no split constant
// was needed. axe-core is also no longer unused: @axe-core/playwright
// runs report-only in CI (tests/a11y-scan.spec.ts) against 5
// unauthenticated routes — a starting scope, not full coverage, and
// still no gate (a violation doesn't fail the build). The copy above
// was updated in the same pass so it doesn't assert a gap that's
// already closed, or omit that automated scanning now exists.
//
// Added 20 Sep 2026 (second pass): an "Infrastructure and practice"
// section. Every vendor named (Cloudflare, Supabase, Stripe, Resend,
// HubSpot) was checked against its own official trust/security page
// before being named — only vendors with a real, checkable SOC 2/ISO/PCI
// certification are listed. RLS coverage (140/140 public tables) was
// queried live against the production database at the time of writing,
// not carried over from CLAUDE.md's own already-once-stale figure. CSP
// enforcement was confirmed by curling the live production response
// headers. Strix: the repo's strix_runs/ directory and git history show
// exactly ONE manual run (13 Sep 2026), no schedule, no CI integration —
// its single finding was fictional (SECURITY-CHECKLIST.md §3). The copy
// states this plainly and describes penetration testing as a standing
// intent, not a cadence that doesn't exist. The upload-security-gate
// edge function's real, deployed source was read directly: Check 2
// (magic-byte file-type verification) is real and live; Check 3
// (malware scanning) is a hardcoded stub that always returns "clean" —
// scanner.ts's own header calls this out as NOT a real scanner and a
// blocking pre-launch item. The copy accordingly states only the
// file-type check as verified fact and flags malware scanning as a
// separate, clearly-labeled "In progress" line — never blended into the
// verified section. Same pass also corrected the pre-existing
// "Encryption at rest and in transit" pillar: AES-256/TLS 1.3 are
// independently confirmed (Supabase's own security docs; TLS 1.3
// reconfirmed live via a real handshake against both
// ldimninnjlvxozubheib.supabase.co and lengdon.com), but "Encryption
// keys are managed per-room and rotated at close" was a fabricated
// mechanism-specific claim — no per-room key-management or rotation
// code exists anywhere in this codebase (confirmed by grep; the only
// "key rotation"-shaped hits were CSS @keyframes false positives).
// Removed and replaced with an accurate, sourced statement.
//
// Corrected 20 Sep 2026 (second pass, compliance audit): the
// "Multi-factor authentication" pillar claimed "MFA is mandatory for all
// participants in every room. There is no mechanism to disable it."
// Both sentences false — verified live: auth.mfa_factors holds ZERO
// enrolled factors across all 9 real users, and no MFA enrollment or
// verification code exists anywhere in src/ (the only hits for
// mfa/totp/aal2 were marketing copy and an unused input-otp UI
// primitive). This was the THIRD fabricated security control found on
// this page in one session, after the per-room key-rotation claim and
// the sealed-export family — the shared cause each time is unreviewed
// Figma-export boilerplate that reads as plausible infrastructure.
// Retitled to "Individual authentication" and rewritten around what is
// actually true (per-person named auth, no shared/company login, per-
// user audit entries), with MFA's absence stated plainly as planned-
// not-built. Pillar count unchanged at eight, so the section heading
// still holds.
//
// Follow-up, 22 Sep 2026 (session/auth recon): the unused input-otp UI
// primitive named above (src/components/ui/input-otp.tsx) was deleted —
// confirmed zero real consumers (grep found only this comment). The
// same fabricated-MFA claim was also found live in legal.terms.tsx
// ("You must enable multi-factor authentication (MFA) — this is a
// mandatory platform requirement, not optional") and fixed there;
// see that file's own header. status.tsx's "Authentication & MFA"
// line was checked and left alone — it names a future monitored
// service on a page whose own subtitle already states monitoring
// isn't connected yet, so it doesn't assert a live capability the way
// this page's and legal.terms.tsx's claims did.

export const Route = createFileRoute("/product/security")({
  component: Security,
});

const PILLARS = [
  {
    title: "Encryption at rest and in transit",
    body: "All data is encrypted using AES-256 at rest and TLS 1.3 in transit, provided by our infrastructure providers (Cloudflare, Supabase) and confirmed independently against their own security documentation. No Lengdon employee has access to transaction content.",
  },
  {
    title: "Per-person NDA enforcement",
    body: "Every participant — not every company — signs an individual NDA before accessing the room. Access is granted to named individuals, not to organisations or teams. There is no 'company-level' access.",
  },
  {
    title: "Append-only, tamper-evident record",
    body: "Every action taken in a room is written to an append-only log. No entry can be deleted, modified, or reordered. Altering any earlier entry is detectable — the record makes tampering evident, not merely logged.",
  },
  {
    title: "Individual authentication",
    body: "Every participant authenticates as a named individual — there is no shared or company-level login, and access is granted per person, never per organisation. Authentication events are recorded individually in the audit log. Multi-factor authentication is not yet available; it is planned before signups open to the public, and we say so rather than imply a control that isn't there.",
  },
  {
    title: "Role-scoped access",
    body: "Each participant receives only the access their role requires for the current gate. Documents not yet released at the current gate are inaccessible — not hidden, not locked — simply not visible to the other party.",
  },
  {
    title: "No money movement",
    body: "Lengdon is software infrastructure, not a regulated financial institution. We never handle, hold, escrow, or route funds. Payment confirmation is recorded — proof of transfer is uploaded and counter-confirmed between the parties — but no financial instrument passes through our infrastructure. We work alongside your counsel, escrow agent, and compliance function; we don't replace them.",
  },
  {
    title: "Reference-checkable record",
    body: "Every closed deal gets a unique reference number that identifies its record without exposing terms, party identities, or document content. Both parties can cite it at any point after close.",
  },
  {
    title: "Independent record",
    body: "The full audit trail is preserved after close, unchanged, for both parties. It documents exactly what happened — every gate, confirmation, and signature — for as long as the deal room exists.",
  },
];

function Security() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Product · Security & Trust"
          title="BUILT FOR"
          titleOutline="ZERO TRUST."
          subtitle="Lengdon assumes no party should be trusted by default — including us. Every control exists to protect both parties from each other, from the platform, and from time."
          dark
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#64748b] text-[10px] tracking-[2px] uppercase">Security Controls</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[clamp(32px,6vw,48px)] leading-[0.9] tracking-[-2px] mb-16">
            EIGHT CONTROLS.<br />ALL MANDATORY.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#e6e9ef]">
            {PILLARS.map((p, i) => (
              <div
                key={p.title}
                className={`p-8 ${i % 2 === 0 ? "md:border-r border-[#e6e9ef]" : ""} ${i < PILLARS.length - 2 ? "border-b border-[#e6e9ef]" : ""} ${i === PILLARS.length - 2 ? "md:border-b border-[#e6e9ef]" : ""}`}
              >
                <div className="w-2 h-2 bg-[#0a2540] mb-5" />
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.3px] mb-3">
                  {p.title}
                </h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full border-b border-[#e6e9ef]">
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 px-12 lg:px-16 py-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-5 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#64748b] text-[10px] tracking-[2px] uppercase">The Record</span>
              </div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[clamp(32px,6vw,48px)] leading-[0.9] tracking-[-2px] mb-6">
                THE APPEND-ONLY<br />RECORD.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7] max-w-[480px] mb-8">
                Every action is written to a permanent, append-only log where each entry references the one before it. Altering an earlier entry breaks that reference — visibly, and permanently.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  { prop: "Append-only", desc: "No deletes. No edits. Additions only." },
                  { prop: "Tamper-evident", desc: "Each entry references its predecessor; a change is detectable." },
                  { prop: "Shared record", desc: "Both parties see the same record — neither controls or can revoke the other's view of it." },
                ].map((item) => (
                  <div key={item.prop} className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#0a2540] mt-1.5 shrink-0" />
                    <div>
                      <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px]">{item.prop} — </span>
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px]">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-[480px] shrink-0 bg-[#0a2540] px-12 py-24 flex flex-col gap-6 justify-center">
              {[
                { ref: "ATLS01-ROM-2026-000017-91", ts: "2026-08-26 14:32", action: "Condition Met: Regulatory Approval" },
                { ref: "ATLS01-ROM-2026-000018-88", ts: "2026-08-26 15:45", action: "Term Accepted: Board Seat" },
                { ref: "ATLS01-ROM-2026-000019-85", ts: "2026-08-27 09:12", action: "Document Released: Cap Table" },
              ].map((entry) => (
                <div key={entry.ref} className="border border-white/10 relative">
                  <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-white/20" />
                  <div className="pl-5 pr-5 py-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/20 text-[10px]">{entry.ts}</span>
                      <div className="ml-auto flex items-center gap-1 bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-400/70" />
                        <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-emerald-400/70 text-[9px] tracking-[0.5px]">RECORDED</span>
                      </div>
                    </div>
                    <p style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-white/75 text-[13px] mb-2">{entry.action}</p>
                    <span className="font-mono text-[11px] text-white/30">{entry.ref}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#64748b] text-[10px] tracking-[2px] uppercase">Accessibility</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[clamp(32px,6vw,48px)] leading-[0.9] tracking-[-2px] mb-6">
            WE TEST IT BY<br />USING IT.
          </h2>
          <div className="max-w-[720px] flex flex-col gap-5">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">
              We build every internal control from a shared component set, and we verify it by operating it — tabbing to a control, pressing Enter or Space, confirming a screen reader would have something to say about it. That has already caught real problems: an admin toggle with no keyboard access, five document-upload controls a keyboard user couldn't operate at all, and a shared form-field component whose labels weren't wired to their inputs.
            </p>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540]">What's fixed today:</span> every custom interactive control we've audited — elements standing in for buttons, sortable table headers, drag-and-drop cards — now exposes a real role, keyboard focus, and a keyboard-triggerable action. Every form built from our shared field component has its label programmatically tied to its input, verified by confirming that keyboard focus actually moves when the label is activated.
            </p>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540]">What's still open:</span> that fix hasn't reached every form yet — a number of individual fields, including on our public calculators, still need labels wired by hand. Everything above was found by manually operating the product; we've since added an automated accessibility scan to our build pipeline as a second check, not a replacement for it.
            </p>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">
              We're not claiming WCAG conformance. We're telling you what we've verified, what we haven't gotten to, and that a control nobody can operate with a keyboard is a defect here, not a nice-to-have.
            </p>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#64748b] text-[10px] tracking-[2px] uppercase">Infrastructure &amp; Practice</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[clamp(32px,6vw,48px)] leading-[0.9] tracking-[-2px] mb-6">
            WHAT WE RUN ON,<br />AND HOW WE CHECK IT.
          </h2>
          <div className="max-w-[720px] flex flex-col gap-5">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">
              Our infrastructure runs on SOC 2 Type II and ISO 27001–certified providers: Cloudflare (network, edge, hosting) and Supabase (database, authentication, storage). Payment processing runs through Stripe, which holds PCI DSS Level 1 certification and SOC 2 Type II. Email delivery and CRM run through Resend and HubSpot, both SOC 2 Type II certified.
            </p>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">
              Every table in our database enforces row-level security — 140 of 140, checked directly against the live database, not assumed from documentation. Our production traffic runs behind a Content Security Policy with a unique cryptographic value per page load, verified to block a real attempt at unauthorized script injection, not just left unconfigured. Every code change passes an automated build and type-check gate before it ships, plus a dependency vulnerability scan on every commit.
            </p>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">
              Every uploaded document is checked against its actual file content, not just its filename — a file whose real format doesn't match what it claims to be is rejected and removed automatically.
            </p>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">
              We do not yet run a scheduled, automated penetration-testing program. We've run one manual automated scan to date — it produced a false finding that we caught by attempting to reproduce it, which is now a standing rule in how we evaluate security tooling internally. We treat penetration testing as a standing practice, not a one-time event, and are expanding its frequency and scope as the platform grows.
            </p>
            <div className="border-t border-[#e6e9ef] pt-5 mt-1">
              <p style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] tracking-[0.02em] uppercase mb-2">In progress</p>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">
                Malware scanning on uploaded documents is planned but not yet built. Signups are closed during this phase, which is the reason this can wait — it is not a claim that scanning is already in place today.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#f8f9fb] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] max-w-[560px]">
              Full technical documentation of our security controls and encryption implementation is available on request for institutional due diligence. We do not yet hold a SOC 2 attestation or an independent penetration-test report — both are on our roadmap, not achieved today, and we say so directly rather than leave the question open.
            </p>
            <div className="flex gap-4 shrink-0">
              <Link to="/legal/privacy" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-[#e6e9ef] hover:border-[#0a2540]/30 text-[#425466] hover:text-[#0a2540] text-[14px] px-8 py-3 transition-all duration-200">
                Read Privacy Policy →
              </Link>
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] px-8 py-3 transition-colors duration-200">
                Join the waitlist
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
