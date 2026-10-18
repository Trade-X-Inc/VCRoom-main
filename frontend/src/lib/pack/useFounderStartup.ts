import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// Shared founder-startup lookup for the three /pack screens, so a founder
// with zero or several companies sees the SAME message everywhere. A plain
// .select() (not .maybeSingle(), which throws on more than one row) so
// "none" and "multiple" are distinct, catchable states rather than a crash
// or a silent null. The startup id is used only as the action scopeId
// (record-chain partition key) — never an authorization input; the pack_api
// functions authorize against the real caller uid server-side.

export class StartupLookupError extends Error {
  constructor(public reason: "none" | "multiple") {
    super(
      reason === "none" ? "startup_lookup_none" : "startup_lookup_multiple",
    );
  }
}

export function startupLookupMessage(error: unknown): string | null {
  if (!(error instanceof StartupLookupError)) return null;
  return error.reason === "none"
    ? "No company profile found for your account. Build your company profile before starting a pack."
    : "Your account is linked to more than one company. This isn't supported yet — contact support.";
}

export function useFounderStartup() {
  const { user, loading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: ["founder-startup", user?.id],
    enabled: !!user?.id,
    // none/multiple are settled answers, not transient failures.
    retry: (count, err) => !(err instanceof StartupLookupError) && count < 2,
    queryFn: async (): Promise<{ id: string; company_name: string | null }> => {
      const { data, error } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", user!.id);
      if (error) throw new Error("startup_lookup_failed");
      if (!data || data.length === 0) throw new StartupLookupError("none");
      if (data.length > 1) throw new StartupLookupError("multiple");
      return data[0];
    },
  });
  return {
    startup: query.data,
    // A disabled query reports isLoading=false; treat "auth still resolving"
    // as loading so no screen flashes an empty state before the user exists.
    isLoading: authLoading || query.isLoading,
    error: query.error,
    // react-query status: "pending" while the user is not built yet (query disabled) or the lookup runs.
    status: query.status,
    message: startupLookupMessage(query.error),
  };
}
