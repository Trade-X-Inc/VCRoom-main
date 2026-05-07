import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { s as supabase } from "./router-CYnoakuB.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    const handleCallback = async () => {
      const {
        data: {
          session
        },
        error
      } = await supabase.auth.getSession();
      if (error || !session) {
        console.error("[Auth Callback] No session:", error);
        navigate({
          to: "/sign-in"
        });
        return;
      }
      const metadata = session.user.user_metadata;
      const userEmail = session.user.email ?? "";
      const pendingRole = localStorage.getItem("oauth_pending_role") || localStorage.getItem(`pending_role_${userEmail}`);
      console.log("[Auth Callback] User:", userEmail);
      console.log("[Auth Callback] Pending role from localStorage:", pendingRole);
      console.log("[Auth Callback] Metadata role:", metadata?.role);
      const {
        data: existingUser,
        error: fetchErr
      } = await supabase.from("users").select("role").eq("id", session.user.id).maybeSingle();
      if (fetchErr) console.error("[Auth Callback] DB fetch error:", fetchErr);
      const finalRole = existingUser?.role || pendingRole || metadata?.role || "founder";
      console.log("[Auth Callback] Existing DB role:", existingUser?.role);
      console.log("[Auth Callback] Final role:", finalRole);
      localStorage.removeItem("oauth_pending_role");
      localStorage.removeItem(`pending_role_${userEmail}`);
      const {
        error: upsertError
      } = await supabase.from("users").upsert({
        id: session.user.id,
        email: session.user.email,
        role: finalRole,
        full_name: metadata?.full_name || metadata?.name || session.user.email?.split("@")[0] || "",
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }, {
        onConflict: "id"
      });
      if (upsertError) console.error("[Auth Callback] Upsert error:", upsertError);
      else console.log("[Auth Callback] User upserted successfully");
      const target = finalRole === "investor" ? "/app/investor/" : "/app";
      console.log("[Auth Callback] Navigating to:", target);
      navigate({
        to: target
      });
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
  return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center min-h-screen", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4" }),
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "Signing you in..." })
  ] }) });
}
export {
  AuthCallback as component
};
