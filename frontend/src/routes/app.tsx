import { createFileRoute, redirect, Outlet, useNavigate } from "@tanstack/react-router";
import { AdminShell } from "@/components/app/AdminShell";
import { MemberShell } from "@/components/app/MemberShell";
import { useAuthStore } from "@/lib/auth-store";
import { useAccountContext } from "@/hooks/useAccountContext";
import { useEffect } from "react";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { user, initialized } = useAuthStore.getState();
    if (initialized && !user) throw redirect({ to: "/sign-in", search: {}, replace: true });
  },
  component: AppLayoutRouter,
});

function AppLayoutRouter() {
  const ctx = useAccountContext();
  const navigate = useNavigate();

  // Redirect members away from /app root to the member overview
  useEffect(() => {
    if (ctx.loading) return;
    if (!ctx.canAccessFullDashboard && ctx.accountType !== "unknown") {
      // Only redirect if they're at exactly /app (the founder overview)
      const path = window.location.pathname;
      if (path === "/app" || path === "/app/") {
        navigate({ to: "/app/member" as any, replace: true });
      }
    }
  }, [ctx.loading, ctx.canAccessFullDashboard, ctx.accountType]);

  // Still loading — render AdminShell skeleton (it handles its own loading state)
  if (ctx.loading) {
    return <AdminShell />;
  }

  // Members (manager / analyst / viewer) get MemberShell
  if (!ctx.canAccessFullDashboard && ctx.accountType !== "unknown") {
    return <MemberShell />;
  }

  // Owners and admins get the full AdminShell
  return <AdminShell />;
}
