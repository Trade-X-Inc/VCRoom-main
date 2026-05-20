import { createServerFn } from "@tanstack/react-start";

export const checkEnv = createServerFn({ method: "POST" })
  .handler(async () => {
    const cf = (globalThis as any).Cloudflare;
    const cfEnv = cf?.env || cf?.context?.env || {};

    return {
      cloudflare_exists: !!cf,
      cloudflare_keys: Object.keys(cf || {}).join(", "),
      cfenv_keys: Object.keys(cfEnv).join(", "),
      OPENAI_present: !!(cfEnv.OPENAI_API_KEY || cf?.OPENAI_API_KEY),
      SERVICE_ROLE_present: !!(cfEnv.SUPABASE_SERVICE_ROLE_KEY || cf?.SUPABASE_SERVICE_ROLE_KEY),
      SUPABASE_URL_present: !!(cfEnv.SUPABASE_URL || cf?.SUPABASE_URL),
      OPENAI_preview: (cfEnv.OPENAI_API_KEY || cf?.OPENAI_API_KEY || "").slice(0, 10) || "missing",
      SERVICE_ROLE_preview: (cfEnv.SUPABASE_SERVICE_ROLE_KEY || cf?.SUPABASE_SERVICE_ROLE_KEY || "").slice(0, 10) || "missing",
      SUPABASE_URL_preview: (cfEnv.SUPABASE_URL || cf?.SUPABASE_URL || "").slice(0, 15) || "missing",
    };
  });
