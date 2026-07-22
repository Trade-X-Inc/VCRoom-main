import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// The founder profile-picture upload (Prepare > Profile Builder > Full Profile,
// see app.profile.tsx handleAvatarUpload) writes to startups.founder_avatar_url.
// UserMenu and AppShell both need this same value for the account avatar — a
// shared hook keeps the query key and column reference in one place.
export function useFounderAvatarUrl(startupId?: string | null) {
  const { data } = useQuery({
    queryKey: ["founder-avatar-url", startupId],
    enabled: !!startupId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("founder_avatar_url")
        .eq("id", startupId as string)
        .maybeSingle();
      return (data as any)?.founder_avatar_url as string | null ?? null;
    },
  });
  return data ?? null;
}
