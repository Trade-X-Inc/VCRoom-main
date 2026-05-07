import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/investor")({
  beforeLoad: async () => {
    try {
      // Retry loop: give Supabase time to restore session from localStorage on page load
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
        .single();

      const role = userRecord?.role || session.user.user_metadata?.role || "founder";
      if (role !== "investor") throw redirect({ to: "/app" });
    } catch (error) {
      if (isRedirect(error)) throw error;
      throw redirect({ to: "/sign-in" });
    }
  },
  component: () => <Outlet />,
});
