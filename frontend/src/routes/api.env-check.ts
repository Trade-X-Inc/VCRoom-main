import { createServerFn } from "@tanstack/react-start";

// Diagnostic endpoint neutralised — previously exposed key names/prefixes to any caller.
// Use Supabase dashboard or Cloudflare dashboard to verify secrets are set.
export const checkEnv = createServerFn({ method: "POST" })
  .handler(async () => {
    return { status: "ok" };
  });
