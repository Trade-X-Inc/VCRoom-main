import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    // beforeLoad runs on the Cloudflare Worker (server) during SSR where
    // localStorage doesn't exist — getSession() would always return null and
    // redirect to /sign-in even for authenticated users. Skip on server;
    // AppShell's useEffect handles client-side role-based navigation.
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

      // Role-based navigation (investor ↔ founder) is handled client-side by
      // AppShell's useEffect. Doing it here caused an infinite redirect loop:
      // /app/investor/* is nested under /app, so beforeLoad fires again after
      // the redirect to /app/investor/, and the loop never terminates.
    } catch (err) {
      if (isRedirect(err)) throw err;
      // On DB error, allow founder dashboard access
    }
  },
  component: () => <AppShell><Outlet /></AppShell>,
});
