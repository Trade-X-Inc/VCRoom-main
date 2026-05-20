import { createServerFn } from "@tanstack/react-start";

export const checkEnv = createServerFn({ method: "POST" })
  .handler(async () => {
    const metaEnv = (import.meta as any).env || {};
    return {
      meta_keys: Object.keys(metaEnv).filter(k =>
        k.includes("OPENAI") || k.includes("SUPABASE") || k.includes("RESEND")
      ).join(", ") || "none",
      VITE_OPENAI: metaEnv.VITE_OPENAI_API_KEY
        ? `present (${String(metaEnv.VITE_OPENAI_API_KEY).slice(0, 7)}...)`
        : "missing",
      VITE_SERVICE_ROLE: metaEnv.VITE_SUPABASE_SERVICE_ROLE_KEY
        ? `present (${String(metaEnv.VITE_SUPABASE_SERVICE_ROLE_KEY).slice(0, 10)}...)`
        : "missing",
      VITE_SUPABASE_URL: metaEnv.VITE_SUPABASE_URL || "missing",
      process_OPENAI: process.env.OPENAI_API_KEY ? "present" : "missing",
      process_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE_KEY ? "present" : "missing",
    };
  });
