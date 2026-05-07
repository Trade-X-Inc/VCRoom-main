import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { s as supabase } from "./router-CAJNflgw.js";
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
      const role = pendingRole || metadata?.role || "founder";
      localStorage.removeItem("oauth_pending_role");
      await supabase.from("users").upsert({
        id: session.user.id,
        email: session.user.email,
        role,
        full_name: metadata?.full_name || metadata?.name || "",
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      });
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
