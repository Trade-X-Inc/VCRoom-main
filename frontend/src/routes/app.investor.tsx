import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/app/investor")({
  beforeLoad: async () => {
    if (typeof window === 'undefined') return;

    try {
      const { user, initialized } = useAuthStore.getState();

      // If store not initialized yet, let through — AppShell handles the guard
      if (!initialized) return;
      if (!user) throw redirect({ to: "/sign-in", search: {}, replace: true });

      // Wrap DB role check with 5s timeout to prevent infinite redirect on 503
      const roleCheck = supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const timeout = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 5000)
      );
      const { data: userRecord } = await Promise.race([roleCheck, timeout]) as any;

      const role = userRecord?.role || user.user_metadata?.role;

      // Only redirect confirmed founders — allow null/undefined (new users) through
      if (role === "founder") throw redirect({ to: "/app", search: {} });
    } catch (err) {
      if (isRedirect(err)) throw err;
      // On DB error or timeout, allow investor dashboard access rather than redirecting to sign-in
    }
  },
  component: InvestorLayout,
});

function InvestorLayout() {
  const [connError, setConnError] = useState(false);

  // Expose a way for child routes to signal a connection failure
  if (connError) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0A0A0B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <p style={{ color: '#ffffff', fontSize: 18, fontWeight: 600 }}>Connection issue</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
          Could not connect to Hockystick. Please check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
          Retry
        </button>
        <a href="/sign-in" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
          Back to sign in
        </a>
      </div>
    );
  }

  return <Outlet />;
}
