import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const checkAIKeys = createServerFn({ method: "GET" }).handler(async () => {
  const fromProcessEnv = process.env.OPENAI_API_KEY || "";
  const fromGlobalThis = (globalThis as any).OPENAI_API_KEY || "";
  const key = fromProcessEnv || fromGlobalThis;

  const supabaseUrl = process.env.SUPABASE_URL || (globalThis as any).SUPABASE_URL || "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (globalThis as any).SUPABASE_SERVICE_ROLE_KEY || "";

  return {
    hasKey: !!key,
    keyPrefix: key ? key.slice(0, 8) : "missing",
    source: fromProcessEnv ? "process.env" : fromGlobalThis ? "globalThis" : "not found",
    supabaseUrl: !!supabaseUrl,
    supabaseKey: !!supabaseKey,
    nodeEnv: process.env.NODE_ENV || "unknown",
  };
});

export const Route = createFileRoute("/api/test-ai")({
  loader: () => checkAIKeys(),
  component: function TestAI() {
    const data = Route.useLoaderData();
    return (
      <pre
        style={{
          padding: 24,
          fontFamily: "monospace",
          fontSize: 14,
          background: "#f8f8f8",
          minHeight: "100vh",
          margin: 0,
          whiteSpace: "pre-wrap",
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  },
});
