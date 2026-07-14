import { createFileRoute } from "@tanstack/react-router";
import { HsButton, StatusDot, SectionLabel, EmptyState, Illustration } from "@/components/system";

// TEMPORARY P1 verification page — deleted before P1 ships.
export const Route = createFileRoute("/design-preview")({
  component: Preview,
});

function Preview() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh", padding: 48, color: "#0A0A0B" }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px" }}>
        Design system
      </h1>

      <div style={{ marginTop: 48 }}>
        <SectionLabel>Buttons</SectionLabel>
        <div style={{ display: "flex", gap: 16, marginTop: 16, alignItems: "center" }}>
          <HsButton variant="primary">Create room</HsButton>
          <HsButton variant="ghost">Cancel</HsButton>
          <HsButton variant="text">View all</HsButton>
          <HsButton variant="primary" disabled>Disabled</HsButton>
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <SectionLabel>Status</SectionLabel>
        <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
          <StatusDot tone="positive" label="Verified" />
          <StatusDot tone="warning" label="Pending" />
          <StatusDot tone="negative" label="Expired" />
          <StatusDot tone="neutral" label="Draft" />
        </div>
      </div>

      <div style={{ marginTop: 48 }}>
        <SectionLabel>Characters</SectionLabel>
        <div style={{ display: "flex", gap: 48, marginTop: 16 }}>
          <Illustration name="empty" />
          <Illustration name="loading" />
          <Illustration name="error" />
          <Illustration name="no-results" />
        </div>
      </div>

      <div style={{ marginTop: 48, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <EmptyState kind="empty" title="No deal rooms yet" action={{ label: "Create" }} />
        <EmptyState kind="loading" title="Loading" />
        <EmptyState kind="error" title="Something went wrong" action={{ label: "Retry" }} />
        <EmptyState kind="no-results" title="No matches" />
      </div>

      <div style={{ marginTop: 48 }}>
        <SectionLabel>Type scale</SectionLabel>
        <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px" }}>Heading — Syne 18 · 700</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 400 }}>Body — Inter 13 · 400. One word says one essay.</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600 }}>$2.4M — value, Inter 13 · 600</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 400, color: "rgba(0,0,0,0.35)" }}>Muted — Inter 12 · 400</div>
          <span className="hs-gradient-text" style={{ fontSize: 13, fontWeight: 600, width: "fit-content" }}>Gradient text</span>
        </div>
      </div>
    </div>
  );
}
