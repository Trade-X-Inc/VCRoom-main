import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { s as supabase } from "./router-CMUL11Nw.js";
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
        navigate({
          to: "/sign-in"
        });
        return;
      }
      const metadata = session.user.user_metadata;
      const pendingRole = localStorage.getItem("oauth_pending_role");
      console.log("Pending role from storage:", pendingRole);
      console.log("Metadata role:", metadata?.role);
      const {
        data: existingUser
      } = await supabase.from("users").select("role").eq("id", session.user.id).single();
      const role = existingUser?.role || pendingRole || metadata?.role || "founder";
      console.log("Final role being saved:", role);
      localStorage.removeItem("oauth_pending_role");
      if (!existingUser) {
        const {
          error: upsertError
        } = await supabase.from("users").upsert({
          id: session.user.id,
          email: session.user.email,
          role,
          full_name: metadata?.full_name || metadata?.name || session.user.email?.split("@")[0] || "",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (upsertError) console.error("Upsert error:", upsertError);
      }
      console.log("Navigating to:", role === "investor" ? "/app/investor" : "/app");
      if (role === "investor") {
        navigate({
          to: "/app/investor"
        });
      } else {
        navigate({
          to: "/app"
        });
      }
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
