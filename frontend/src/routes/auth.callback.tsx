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
        console.error("[Auth Callback] No session:", error);
        navigate({ to: "/sign-in" });
        return;
      }

      const metadata = session.user.user_metadata;
      const userEmail = session.user.email ?? "";

      // Read both localStorage keys (OAuth sets oauth_pending_role, email signup sets pending_role_<email>)
      const pendingRole = localStorage.getItem("oauth_pending_role") || localStorage.getItem(`pending_role_${userEmail}`);
      console.log("[Auth Callback] User:", userEmail);
      console.log("[Auth Callback] Pending role from localStorage:", pendingRole);
      console.log("[Auth Callback] Metadata role:", metadata?.role);

      // Check if user already has a role in DB (returning users)
      const { data: existingUser, error: fetchErr } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (fetchErr) console.error("[Auth Callback] DB fetch error:", fetchErr);

      // Priority: DB role > localStorage > metadata > default
      const finalRole = existingUser?.role || pendingRole || metadata?.role || "founder";
      console.log("[Auth Callback] Existing DB role:", existingUser?.role);
      console.log("[Auth Callback] Final role:", finalRole);

      // Clean up localStorage
      localStorage.removeItem("oauth_pending_role");
      localStorage.removeItem(`pending_role_${userEmail}`);

      // Always upsert — existing users write back their DB role (no-op); new users write pending role
      const { error: upsertError } = await supabase.from("users").upsert(
        {
          id: session.user.id,
          email: session.user.email,
          role: finalRole,
          full_name: metadata?.full_name || metadata?.name || session.user.email?.split("@")[0] || "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (upsertError) console.error("[Auth Callback] Upsert error:", upsertError);
      else console.log("[Auth Callback] User upserted successfully");

      const target = finalRole === "investor" ? "/app/investor/" : "/app";
      console.log("[Auth Callback] Navigating to:", target);

      // Primary navigation via TanStack Router
      navigate({ to: target as any });

      // Fallback: force full page reload after 100ms in case navigate silently fails
      setTimeout(() => {
        if (finalRole === "investor") {
          window.location.href = "/app/investor/";
        } else {
          window.location.href = "/app";
        }
      }, 100);
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
