import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app")({
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

      const role = userRecord?.role || session.user.user_metadata?.role || "founder";
      if (role === "investor") throw redirect({ to: "/app/investor/" });
    } catch (err) {
      if (isRedirect(err)) throw err;
      // On DB error, allow founder dashboard access
    }
  },
  component: () => <AppShell><Outlet /></AppShell>,
});
