import { supabase } from "@/lib/supabase";

/** The signed-in user's own access token, for server functions that resolve the caller themselves. */
export async function currentAccessToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? undefined;
}
