import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const checkAIKeys = createServerFn({ method: "GET" }).handler(async () => {
  const sources = {
    processEnv: process.env.OPENAI_API_KEY || "",
    globalThis: (globalThis as any).OPENAI_API_KEY || "",
    importMeta: (import.meta as any).env?.OPENAI_API_KEY || "",
    viteEnv: import.meta.env.VITE_OPENAI_API_KEY || "",
  };

  const key = sources.processEnv || sources.globalThis || sources.importMeta || sources.viteEnv || "";

  const supabaseSources = {
    processEnv: process.env.SUPABASE_URL || "",
    globalThis: (globalThis as any).SUPABASE_URL || "",
    viteEnv: import.meta.env.VITE_SUPABASE_URL || "",
  };

  const supabaseUrl = supabaseSources.processEnv || supabaseSources.globalThis || supabaseSources.viteEnv || "";

  const supabaseKeySources = {
    processEnv: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    globalThis: (globalThis as any).SUPABASE_SERVICE_ROLE_KEY || "",
    viteEnv: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  };

  const supabaseKey =
    supabaseKeySources.processEnv || supabaseKeySources.globalThis || supabaseKeySources.viteEnv || "";

  return {
    openai: {
      hasKey: !!key,
      keyPrefix: key ? key.slice(0, 8) : "missing",
      sources: {
        processEnv: !!sources.processEnv,
        globalThis: !!sources.globalThis,
        importMeta: !!sources.importMeta,
        viteEnv: !!sources.viteEnv,
      },
    },
    supabase: {
      url: {
        found: !!supabaseUrl,
        sources: {
          processEnv: !!supabaseKeySources.processEnv,
          globalThis: !!supabaseSources.globalThis,
          viteEnv: !!supabaseSources.viteEnv,
        },
      },
      key: {
        found: !!supabaseKey,
        sources: {
          processEnv: !!supabaseKeySources.processEnv,
          globalThis: !!supabaseKeySources.globalThis,
          viteEnv: !!supabaseKeySources.viteEnv,
        },
      },
    },
    nodeEnv: process.env.NODE_ENV || (globalThis as any).NODE_ENV || "unknown",
  };
});

export const Route = createFileRoute("/api/test-ai")({
  loader: () => checkAIKeys(),
  component: function TestAI() {
    const data = Route.useLoaderData();
    const clientKey = import.meta.env.VITE_OPENAI_API_KEY || "";
    const output = {
      serverSide: data,
      clientSide: {
        VITE_OPENAI_API_KEY: clientKey ? clientKey.slice(0, 8) + "..." : "missing",
        hasKey: !!clientKey,
      },
    };
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
        {JSON.stringify(output, null, 2)}
      </pre>
    );
  },
});
