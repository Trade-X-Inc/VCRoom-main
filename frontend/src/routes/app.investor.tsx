import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/app/investor")({
  beforeLoad: async () => {
    if (typeof window === 'undefined') return;

    try {
      const { user, initialized } = useAuthStore.getState();

      // If store not initialized yet, let through — AppShell handles the guard
      if (!initialized) return;
      if (!user) throw redirect({ to: "/sign-in", search: {} });

      const { data: userRecord } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = userRecord?.role || user.user_metadata?.role;

      // Only redirect confirmed founders — allow null/undefined (new users) through
      if (role === "founder") throw redirect({ to: "/app", search: {} });
    } catch (err) {
      if (isRedirect(err)) throw err;
      // On DB error, allow investor dashboard access rather than redirecting to sign-in
    }
  },
  component: () => <Outlet />,
});
