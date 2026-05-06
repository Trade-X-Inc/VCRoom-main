import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/sign-in" });
    const { data: userRecord } = await supabase.from("users").select("role").eq("id", session.user.id).single();
    if (userRecord?.role === "investor") throw redirect({ to: "/app/investor" });
  },
  component: () => <AppShell><Outlet /></AppShell>,
});
