import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/debug")({
  component: () => (
    <pre style={{ padding: 20, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
      {JSON.stringify(
        {
          VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? "SET ✓" : "MISSING ✗",
          VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? "SET ✓" : "MISSING ✗",
          VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID ? "SET ✓" : "MISSING ✗",
          VITE_APP_URL: import.meta.env.VITE_APP_URL || "(not set)",
          MODE: import.meta.env.MODE,
          PROD: import.meta.env.PROD,
        },
        null,
        2,
      )}
    </pre>
  ),
});
