import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "@/lib/env";

export const checkEnv = createServerFn({ method: "POST" })
  .handler(async () => {
    const openAIKey = getEnvVar("OPENAI_API_KEY");
    const serviceKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    return {
      OPENAI_API_KEY: openAIKey ? `present (${openAIKey.slice(0, 7)}...)` : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: serviceKey ? `present (${serviceKey.slice(0, 10)}...)` : "MISSING",
      SUPABASE_URL: getEnvVar("SUPABASE_URL") || "MISSING",
      VITE_SUPABASE_URL: getEnvVar("VITE_SUPABASE_URL") || "MISSING",
      NODE_ENV: process.env.NODE_ENV || "MISSING",
      ALL_PROCESS_ENV_KEYS: Object.keys(process.env).filter(k => !k.startsWith("npm_")).join(", ") || "none",
    };
  });
