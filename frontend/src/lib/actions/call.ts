// Client-side helper for invoking gateway actions (defineAction results).
//
// Every action is a createServerFn expecting an envelope:
//   { accessToken, scopeId, isAgent?, input }
// and returning ActionResult<JsonValue> = {ok:true,data} | {ok:false,error,status}.
//
// callAction() does three things every call site would otherwise repeat:
//   1. resolves the caller's access token from the current Supabase session
//      (identity is derived server-side from this token — never a userId field);
//   2. passes scopeId (the record-chain partition — deal_room_id for deal-room
//      actions; see AUTHZ_MAPPING.md § record scope);
//   3. unwraps ActionResult — returns data on ok, throws Error(error) otherwise,
//      so call sites use ordinary try/catch exactly as they did with supabase.
//
// isAgent is always false here: this is the human web interface. The agent
// interface is a separate consumer and will set it true (and be blocked from
// commit-class actions by the gateway, §15.3).

import { supabase } from "@/lib/supabase";
import type { JsonValue, ActionResult } from "./gateway";

type ServerAction = (opts: {
  data: { accessToken: string; scopeId: string; isAgent?: boolean; input: unknown };
}) => Promise<ActionResult<JsonValue>>;

export async function callAction<T = JsonValue>(
  action: ServerAction,
  scopeId: string,
  input: unknown,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await action({
    data: { accessToken: session?.access_token ?? "", scopeId, isAgent: false, input },
  });
  if (!res.ok) throw new Error(res.error);
  return res.data as T;
}
