import { AlertTriangle } from "lucide-react";

// LCS-token version of AdvisorPreviewBanner (app.advisor-preview.*), same
// standard: this is deliberately loud, not a code comment, per CLAUDE.md
// §7.4's twice-recorded lesson that a plausible placeholder plus a promise
// to fix it later is how invented content ships. Rendered on the ticket
// submission/list and credits sections of the Support page — NOT on the
// feedback-rating form, which is real and already writes to the live
// `feedback` table.

export function SupportPreviewBanner({ text }: { text: string }) {
  return (
    <div
      className="mb-6 flex items-start gap-3 p-4"
      style={{ border: "1px solid var(--lcs-attention)", background: "var(--lcs-attention-wash)" }}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--lcs-attention)" }} />
      <div>
        <div
          className="font-bold"
          style={{ fontSize: 11, letterSpacing: "0.055em", color: "var(--lcs-attention)", fontFamily: "var(--font-lcs-ui)" }}
        >
          DESIGN PREVIEW — NOT A WORKING FEATURE
        </div>
        <p className="mt-1" style={{ fontSize: 13, color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
          {text}
        </p>
      </div>
    </div>
  );
}
