import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/investor")({
  beforeLoad: async () => {
    try {
      let session = null;
      let attempts = 0;
      while (!session && attempts < 3) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
        if (!session && attempts < 2) await new Promise((r) => setTimeout(r, 300));
        attempts++;
      }

      if (!session) throw redirect({ to: "/sign-in" });

      const { data: userRecord } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      const role = userRecord?.role || session.user.user_metadata?.role;

      // Only redirect confirmed founders — allow null/undefined (new users) through
      if (role === "founder") throw redirect({ to: "/app" });
      // If role is null/undefined, allow access rather than locking out new users
    } catch (err) {
      if (isRedirect(err)) throw err;
      // On DB error, allow investor dashboard access rather than redirecting to sign-in
    }
  },
  component: () => <Outlet />,
});
