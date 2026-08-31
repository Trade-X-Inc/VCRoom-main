import { AlertTriangle } from "lucide-react";

// Visible, unmissable in-app marker that an advisor-preview screen is a
// design artifact and not a working feature. Rendered at the top of every
// app.advisor-preview.* route.
//
// This is deliberately loud. CLAUDE.md §7.4 records two separate occasions
// where invented content shipped to real users because it was written to
// look plausible and a source comment promising a later fix was treated as
// mitigation. A comment is not a mitigation — the person looking at the
// screen has to be told. Hence a banner, not a code comment.

export function AdvisorPreviewBanner() {
  return (
    <div
      className="mb-6 flex items-start gap-3 border p-4"
      style={{
        borderColor: "var(--v2-attention)",
        background: "var(--v2-attention-wash)",
        borderRadius: "var(--v2-radius)",
      }}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--v2-attention)" }} />
      <div>
        <div
          className="font-v2-ui font-bold"
          style={{ fontSize: "11px", letterSpacing: "0.055em", color: "var(--v2-attention)" }}
        >
          DESIGN PREVIEW — NOT A WORKING SCREEN
        </div>
        <p className="mt-1 font-v2-ui" style={{ fontSize: "13px", color: "var(--v2-ink-secondary)" }}>
          Every company, figure and record on this page is invented placeholder content for
          visual review. The advisor role does not exist in the product: there is no advisor
          permission, no client-company link, and no data behind this page. Nothing here can be
          acted on.
        </p>
      </div>
    </div>
  );
}
