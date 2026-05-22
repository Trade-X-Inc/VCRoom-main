import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const { user, initialized } = useAuthStore.getState();
    // Only redirect if we know the user is definitely not authenticated
    if (initialized && !user) throw redirect({ to: "/sign-in", search: {}, replace: true });
  },
  component: AppShell,
});
