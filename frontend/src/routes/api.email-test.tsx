import { createFileRoute } from "@tanstack/react-router";

// Moved to /api/internal/email-test
export const Route = createFileRoute("/api/email-test")({
  component: () => (
    <pre style={{ padding: 24, fontFamily: "monospace", fontSize: 14, background: "#0a0a0b", color: "#71717a", minHeight: "100vh", margin: 0 }}>
      {"{ \"moved\": \"/api/internal/email-test\" }"}
    </pre>
  ),
});
