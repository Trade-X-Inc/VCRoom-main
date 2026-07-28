import { supabase } from "@/lib/supabase";

// Extracted from lib/supabase.ts — that file is never touched (CLAUDE.md
// rule: NEVER touch src/lib/supabase.ts). This is a pure consumer of its
// already-exported `supabase` client, with no relationship to the auth
// listener singleton set up in lib/auth.tsx, so moving it here carries no
// risk of the "multiple Supabase auth listener" problem (CLAUDE.md §5.5).
//
// lib/supabase.ts's own logActivity export is left in place, untouched and
// unused going forward — the three real call sites now import from here.
export async function logActivity(
  dealRoomId: string,
  actorId: string,
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("activities")
    .insert({ deal_room_id: dealRoomId, actor_id: actorId, action, metadata: metadata ?? {} });
  if (error) console.error("[logActivity] insert failed:", error.message);
}
