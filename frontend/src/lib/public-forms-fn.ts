import { createServerFn } from "@tanstack/react-start";
import { requireUserIdentity } from "@/lib/require-user-fn";
import { readProviderEnv } from "@/lib/email/server-env";
import {
  waitlistFormHandler,
  contactFormHandler,
  demoFormHandler,
  syncOwnContactHandler,
} from "@/lib/email/handlers";

// CRM and Notion writes reachable from a browser (CLAUDE.md §20.23). The browser never writes to HubSpot or Notion
// itself and never supplies a property map.
//
// C: the three public forms. Public by design, so the protection is strict validation: every field has a length cap,
// unknown fields are refused, the HubSpot properties are built here from a fixed allow-list (policy.ts), and the
// source and slot values come from fixed lists. Per-IP rate limits belong in a Cloudflare rule (open item).
//
// A: a signed-in user's own contact. The address is the verified session's, never a request field.

export const submitWaitlistForm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as unknown)
  .handler(async ({ data }) =>
    waitlistFormHandler({ env: readProviderEnv() }, data),
  );

export const submitContactForm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as unknown)
  .handler(async ({ data }) =>
    contactFormHandler({ env: readProviderEnv() }, data),
  );

export const submitDemoRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as unknown)
  .handler(async ({ data }) =>
    demoFormHandler({ env: readProviderEnv() }, data),
  );

export const syncOwnContact = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { accessToken?: string; kind?: string })
  .handler(async ({ data }) => {
    const d = (data && typeof data === "object" ? data : {}) as Record<
      string,
      unknown
    >;
    const { accessToken, ...rest } = d;
    const auth = await requireUserIdentity(
      typeof accessToken === "string" ? accessToken : undefined,
    );
    if (!auth.ok) return { ok: false as const, error: auth.error };
    return syncOwnContactHandler(
      { env: readProviderEnv() },
      auth.identity,
      rest,
    );
  });
