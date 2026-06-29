import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

// Diagnostic endpoint neutralised — previously read key values via import.meta.env
// and returned key prefixes in API responses, which could expose secret presence.
const checkAIKeys = createServerFn({ method: "GET" }).handler(async () => {
  return { status: "ok" };
});

export const Route = createFileRoute("/api/test-ai")({
  loader: () => checkAIKeys(),
  component: function TestAI() {
    return (
      <pre
        style={{
          padding: 24,
          fontFamily: "monospace",
          fontSize: 14,
          background: "#f8f8f8",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        {"{}"}
      </pre>
    );
  },
});
