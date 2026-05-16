import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    if (typeof window === 'undefined') return;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw redirect({ to: "/sign-in", search: {} });
    } catch (err) {
      if (isRedirect(err)) throw err;
    }
  },
  component: AppShell,
});
