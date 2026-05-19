import { createServerFn } from "@tanstack/react-start";

export const checkEnv = createServerFn({ method: "POST" })
  .handler(async () => {
    return {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
        ? `present (${process.env.OPENAI_API_KEY.slice(0, 7)}...)`
        : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? `present (${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 10)}...)`
        : "MISSING",
      SUPABASE_URL: process.env.SUPABASE_URL || "MISSING",
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "MISSING",
      NODE_ENV: process.env.NODE_ENV || "MISSING",
    };
  });
