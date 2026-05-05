import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing Supabase client env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(url, anonKey);

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function logActivity(
  dealRoomId: string,
  actorId: string,
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from("activities")
    .insert({ deal_room_id: dealRoomId, actor_id: actorId, action, metadata: metadata ?? {} });
}

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: string,
  dealRoomId?: string,
  actionUrl?: string,
): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
    type,
    deal_room_id: dealRoomId ?? null,
    action_url: actionUrl ?? null,
  });
}

export async function uploadDocument(
  file: File,
  dealRoomId: string,
  userId: string,
): Promise<{ path: string; signedUrl: string } | null> {
  const path = `${dealRoomId}/${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from("documents")
    .upload(path, file, { upsert: false });
  if (error) { console.error(error); return null; }
  const { data } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 60 * 60);
  return data ? { path, signedUrl: data.signedUrl } : null;
}
