import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        navigate({ to: "/sign-in" });
        return;
      }

      const metadata = session.user.user_metadata;
      const pendingRole = localStorage.getItem("oauth_pending_role");
      const role = pendingRole || metadata?.role || "founder";
      localStorage.removeItem("oauth_pending_role");

      await supabase.from("users").upsert({
        id: session.user.id,
        email: session.user.email,
        role,
        full_name: metadata?.full_name || metadata?.name || "",
        updated_at: new Date().toISOString(),
      });

      if (role === "investor") {
        navigate({ to: "/app/investor" });
      } else {
        navigate({ to: "/app" });
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
