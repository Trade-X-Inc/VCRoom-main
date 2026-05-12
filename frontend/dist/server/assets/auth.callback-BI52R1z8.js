import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { s as supabase } from "./router-C9QH749P.js";
import "@tanstack/react-router";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
function AuthCallback() {
  const [msg, setMsg] = useState("Signing you in...");
  useEffect(() => {
    const run = async () => {
      try {
        let session = null;
        let attempts = 0;
        while (!session && attempts < 10) {
          const {
            data
          } = await supabase.auth.getSession();
          session = data.session;
          if (!session) {
            await new Promise((r) => setTimeout(r, 500));
          }
          attempts++;
        }
        if (!session) {
          setMsg("Could not sign in. Redirecting...");
          setTimeout(() => {
            window.location.href = "/sign-in";
          }, 2e3);
          return;
        }
        const userId = session.user.id;
        const userEmail = session.user.email || "";
        const pending = localStorage.getItem("pending_role") || "";
        localStorage.removeItem("pending_role");
        const {
          data: existing
        } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
        const role = existing?.role || pending || session.user.user_metadata?.role || "founder";
        setMsg(`Welcome! Loading your dashboard...`);
        await supabase.from("users").upsert({
          id: userId,
          role,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || userEmail.split("@")[0],
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }, {
          onConflict: "id"
        });
        window.location.href = role === "investor" ? "/app/investor/" : "/app";
      } catch (err) {
        console.error("Callback error:", err);
        window.location.href = "/sign-in";
      }
    };
    run();
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center bg-background gap-4", children: [
    /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-full border-4 border-purple-600/30 border-t-purple-600 animate-spin" }),
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: msg })
  ] });
}
export {
  AuthCallback as component
};
