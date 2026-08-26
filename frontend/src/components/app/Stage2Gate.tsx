import { Lock } from "lucide-react";

// Extracted from DealRoomWorkflow.tsx (25 Aug 2026 audit, deleted 27 Aug 2026 —
// see CLAUDE.md §20.12 correction) when the rest of that file was confirmed
// dead. This is the one export that was still live, imported by the v2
// documents tab (app.deal-rooms.$id.documents.tsx).

export function Stage2Gate({ stage2Unlocked }: { stage2Unlocked: boolean }) {
  if (stage2Unlocked) return null;
  return (
    <div
      data-testid="stage2-gate"
      style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)",
        borderRadius: 10, padding: "12px 16px", marginBottom: 12,
      }}
    >
      <Lock style={{ width: 14, height: 14, color: "#F59E0B", flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
        Full diligence documents unlock after a term sheet is sent.
      </span>
    </div>
  );
}
