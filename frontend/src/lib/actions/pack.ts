// Pack actions — first real consumers of the gateway (defineAction).
// Read-class. Reaches pack_v1 ONLY via pack_api SECURITY DEFINER RPCs.
// See gateway.ts and WHY_PACK_API.md.

import { defineAction, type JsonValue } from "./gateway";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PackGetInput = { packId: string };
// pack_api.pack_get returns { ok, pack, fields } as jsonb — a JSON object.
type PackGetOutput = { [k: string]: JsonValue };

// pack.get — fetch a pack by id, authorized to the caller's asserted org.
// (The design named this "getBySlug"; pack_v1.pack has no slug column — it keys
// on id/org_id/subject_ref — so the honest first Read action is get-by-id.)
//
// Authorization lives in pack_api.pack_get: it confirms the pack's org_id
// matches the org the caller asserted (ctx.orgId). The action's authorize()
// step is where a membership check (uid ∈ org) binds at cutover, once
// public.organization_members is linked; today pack_v1 has no membership table,
// so authorize() delegates the org-ownership check to the RPC and returns true
// to reach it. Flagged, not hidden — see the cutover TODO.
export const packGet = defineAction<PackGetInput, PackGetOutput>({
  name: "pack.get",
  class: "read",

  validate: (raw): PackGetInput => {
    const r = raw as { packId?: unknown };
    if (typeof r?.packId !== "string" || !UUID_RE.test(r.packId)) {
      throw new Error("packId must be a uuid");
    }
    return { packId: r.packId };
  },

  authorize: async (ctx, input) => {
    // Pre-cutover: the real org-ownership authorization is inside
    // pack_api.pack_get (returns 'forbidden' if ctx.orgId doesn't own the pack).
    // This returns true to reach it. TODO(cutover): add
    //   uid ∈ organization_members(org_id) here, once that table is linked.
    void ctx;
    void input;
    return true;
  },

  handle: async (ctx, input): Promise<PackGetOutput> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("pack_get", {
      p_uid: ctx.uid,
      p_org_id: ctx.orgId,
      p_pack_id: input.packId,
    });
    if (error) throw new Error(`pack_get_rpc: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & PackGetOutput;
    if (!res.ok) throw new Error(res.error ?? "pack_get_failed");
    return res;
  },

  record: (input) => ({
    objectType: "pack",
    objectId: input.packId,
    data: { read: true },
  }),
});
