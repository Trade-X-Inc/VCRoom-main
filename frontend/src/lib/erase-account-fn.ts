import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "@/lib/env";
import { requireUser } from "@/lib/require-user-fn";

// Account erasure — the real one (20 Sep 2026).
//
// Replaces the previous "delete account" behaviour, which set
// public.users.role = 'deleted' and nothing else: the account stayed
// signable-in and every FK-linked row stayed attached (CLAUDE.md §19q).
//
// TWO STEPS ARE REQUIRED AND NEITHER IS SUFFICIENT ALONE:
//   1. pack_api.erase_user_account() — handles everything in the public
//      schema. Deleting public.users is what actually fires the 22
//      ON DELETE CASCADE constraints; the 34 NO ACTION constraints are
//      handled explicitly first (anonymise to sentinel, or hard delete),
//      and an active-room membership refuses the whole operation.
//   2. The Admin API delete of auth.users — this is what actually stops
//      sign-in. SQL cannot do it: ZERO foreign keys in this database
//      reference auth.users, so a DELETE there cascades nothing and a
//      SECURITY DEFINER function has no route to the auth schema's own
//      deletion semantics. Verified live: after step 1 alone, the
//      auth.users row is still present and the account can still sign in.
//
// Identity is derived from the caller's own bearer token via requireUser
// (§19d.1) — never from a client-supplied uid. A caller can only ever
// erase themselves; there is no uid parameter to spoof.

type EraseResult =
  | {
      ok: true;
      anonymizedRows: number;
      hardDeletedRows: number;
      retainedRecordEntries: number;
    }
  | { ok: false; error: "not_authenticated" | "db_unavailable" | "failed" }
  | { ok: false; error: "blocked"; blockReasons: string[] };

export const eraseAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { accessToken?: string })
  .handler(async ({ data }): Promise<EraseResult> => {
    const auth = await requireUser(data?.accessToken);
    if (!auth.ok) return { ok: false, error: auth.error };
    const uid = auth.uid;

    const url = getEnvVar("SUPABASE_URL");
    const key = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return { ok: false, error: "db_unavailable" };

    // ── Step 1: public schema (cascade + anonymise + hard delete) ──────
    let rpc: Response;
    try {
      rpc = await fetch(`${url}/rest/v1/rpc/erase_user_account`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Content-Profile": "pack_api",
        },
        body: JSON.stringify({ p_uid: uid }),
      });
    } catch {
      return { ok: false, error: "db_unavailable" };
    }
    if (!rpc.ok) return { ok: false, error: "failed" };

    const verdict = (await rpc.json()) as {
      ok?: boolean;
      error?: string;
      block_reasons?: string[];
      anonymized_rows?: number;
      hard_deleted_rows?: number;
      retained_record_entries?: number;
    };

    if (!verdict?.ok) {
      if (verdict?.error === "blocked") {
        return {
          ok: false,
          error: "blocked",
          blockReasons: verdict.block_reasons ?? [],
        };
      }
      return { ok: false, error: "failed" };
    }

    // ── Step 2: auth.users — the step that actually disables sign-in ───
    // Step 1 has already committed. If this fails the account is left in a
    // half-erased state (public data gone, credential alive), which is
    // strictly safer than the reverse but must never be reported as
    // success — the user would believe sign-in is disabled when it isn't.
    let adminResp: Response;
    try {
      adminResp = await fetch(`${url}/auth/v1/admin/users/${uid}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
    } catch {
      return { ok: false, error: "failed" };
    }
    if (!adminResp.ok) return { ok: false, error: "failed" };

    return {
      ok: true,
      anonymizedRows: verdict.anonymized_rows ?? 0,
      hardDeletedRows: verdict.hard_deleted_rows ?? 0,
      retainedRecordEntries: verdict.retained_record_entries ?? 0,
    };
  });
