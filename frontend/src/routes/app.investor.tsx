import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/investor")({
  beforeLoad: async () => {
    // beforeLoad runs on the Cloudflare Worker (server) during SSR where
    // localStorage doesn't exist — getSession() would always return null and
    // redirect to /sign-in even for authenticated users. Skip on server;
    // AppShell's useEffect handles client-side auth guards.
    if (typeof window === 'undefined') return;

    try {
      let session = null;
      let attempts = 0;
      while (!session && attempts < 3) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
        if (!session && attempts < 2) await new Promise((r) => setTimeout(r, 300));
        attempts++;
      }

      if (!session) throw redirect({ to: "/sign-in", search: {} });

      const { data: userRecord } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      const role = userRecord?.role || session.user.user_metadata?.role;

      // Only redirect confirmed founders — allow null/undefined (new users) through
      if (role === "founder") throw redirect({ to: "/app", search: {} });
    } catch (err) {
      if (isRedirect(err)) throw err;
      // On DB error, allow investor dashboard access rather than redirecting to sign-in
    }
  },
  component: () => <AppShell><Outlet /></AppShell>,
});
