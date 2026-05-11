import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { L as Logo } from "./Logo-CIkq6vsm.js";
import { AlertTriangle, Check, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { R as Route, u as useAuth, s as supabase } from "./router-DOcN9fVX.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
function JoinFlow() {
  const {
    token
  } = Route.useParams();
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    designation: "",
    company: "",
    country: "",
    agreedToNda: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  useEffect(() => {
    async function loadInvite() {
      const {
        data,
        error
      } = await supabase.from("invites").select("token, deal_room_id, email, role, invited_by, expires_at, deal_rooms(id, startups(company_name))").eq("token", token).is("accepted_at", null).single();
      if (error || !data) {
        setLoadError("This invite link is invalid or has already been used.");
        return;
      }
      if (new Date(data.expires_at) < /* @__PURE__ */ new Date()) {
        setLoadError("This invite link has expired. Please request a new one.");
        return;
      }
      setInvite(data);
      if (user?.fullName) {
        setFormData((f) => ({
          ...f,
          fullName: user.fullName
        }));
      }
    }
    loadInvite();
  }, [token, user?.name]);
  const companyName = invite?.deal_rooms?.startups?.company_name ?? "the startup";
  const handleSignAndEnter = async () => {
    if (!formData.agreedToNda || !invite) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      let userId = user?.id;
      if (!userId) {
        const anonEmail = invite.email ?? `guest_${token.slice(0, 8)}@ventureroom.app`;
        const {
          data: authData,
          error: authErr
        } = await supabase.auth.signInAnonymously();
        if (authErr || !authData.user) throw new Error("Authentication failed. Please sign in first.");
        userId = authData.user.id;
      }
      const {
        error: memberErr
      } = await supabase.from("deal_room_members").upsert({
        deal_room_id: invite.deal_room_id,
        user_id: userId,
        role: invite.role,
        invited_by: invite.invited_by,
        accepted_at: (/* @__PURE__ */ new Date()).toISOString()
      }, {
        onConflict: "deal_room_id,user_id"
      });
      if (memberErr) throw memberErr;
      await supabase.from("invites").update({
        accepted_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("token", token);
      setStep(3);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  if (loadError) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-background flex items-center justify-center p-6", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/15 text-destructive", children: /* @__PURE__ */ jsx(AlertTriangle, { className: "h-7 w-7" }) }),
      /* @__PURE__ */ jsx("h2", { className: "mt-5 text-xl font-semibold", children: loadError }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Contact the deal room owner for a new invite link." })
    ] }) });
  }
  if (!invite) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-background flex items-center justify-center", children: /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground animate-pulse", children: "Loading invite…" }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background grid lg:grid-cols-[1fr_480px]", children: [
    /* @__PURE__ */ jsxs("div", { className: "hidden lg:block relative overflow-hidden bg-primary text-primary-foreground p-12", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-mesh opacity-30" }),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 noise opacity-40" }),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx(Logo, {}),
        /* @__PURE__ */ jsxs("div", { className: "mt-32 max-w-md", children: [
          /* @__PURE__ */ jsx("h1", { className: "text-4xl font-semibold tracking-[-0.03em] leading-tight", children: "You've been invited to a deal room." }),
          /* @__PURE__ */ jsxs("p", { className: "mt-4 text-primary-foreground/70", children: [
            companyName,
            " has invited you to evaluate their deal. Sign the NDA to access documents, Q&A, and the full diligence packet."
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-10 space-y-3 text-sm", children: ["Bank-grade encryption", "Watermarked documents", "Audit trail on every action"].map((t) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-primary-foreground/80", children: [
            /* @__PURE__ */ jsx(Check, { className: "h-4 w-4 text-success" }),
            " ",
            t
          ] }, t)) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center p-6 lg:p-12", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md", children: [
      /* @__PURE__ */ jsx("div", { className: "lg:hidden mb-8", children: /* @__PURE__ */ jsx(Logo, {}) }),
      /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 mb-8", children: [1, 2, 3].map((s) => /* @__PURE__ */ jsx("div", { className: `h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-gradient-brand" : "bg-muted"}` }, s)) }),
      step === 1 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-semibold tracking-tight", children: "Tell us who you are" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm text-muted-foreground", children: [
          "This information is shared with ",
          companyName,
          "."
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-6 space-y-3", children: [{
          label: "Full name",
          key: "fullName"
        }, {
          label: "Designation",
          key: "designation"
        }, {
          label: "Company",
          key: "company"
        }, {
          label: "Country",
          key: "country"
        }].map(({
          label,
          key
        }) => /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: label }),
          /* @__PURE__ */ jsx("input", { value: formData[key], onChange: (e) => setFormData({
            ...formData,
            [key]: e.target.value
          }), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" })
        ] }, key)) }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setStep(2), disabled: !formData.fullName.trim(), className: "mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-50", children: [
          "Continue ",
          /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })
        ] })
      ] }),
      step === 2 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs", children: [
          /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5 text-brand" }),
          " Mutual NDA"
        ] }),
        /* @__PURE__ */ jsx("h2", { className: "mt-3 text-2xl font-semibold tracking-tight", children: "Sign the NDA" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Auto-filled with the details you just provided." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-5 rounded-xl border border-border/60 bg-card p-5 max-h-[280px] overflow-y-auto text-xs leading-relaxed text-muted-foreground", children: [
          /* @__PURE__ */ jsx("p", { className: "text-foreground font-medium mb-2", children: "Mutual Non-Disclosure Agreement" }),
          /* @__PURE__ */ jsxs("p", { children: [
            "This Agreement is entered into between",
            " ",
            /* @__PURE__ */ jsx("span", { className: "text-foreground font-medium", children: companyName }),
            ' ("Discloser") and',
            " ",
            /* @__PURE__ */ jsxs("span", { className: "text-foreground font-medium", children: [
              formData.fullName,
              formData.company ? `, ${formData.company}` : ""
            ] }),
            " ",
            '("Recipient") as of ',
            (/* @__PURE__ */ new Date()).toLocaleDateString(),
            "."
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-2", children: "The Recipient agrees to hold all Confidential Information in strict confidence, use it solely for the purpose of evaluating a potential investment, and not disclose it to any third party without prior written consent…" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2", children: "This Agreement shall remain in effect for a period of two (2) years from the date of execution." })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "mt-4 flex items-start gap-2.5 cursor-pointer", children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: formData.agreedToNda, onChange: (e) => setFormData({
            ...formData,
            agreedToNda: e.target.checked
          }), className: "mt-0.5 h-4 w-4 accent-[var(--brand)]" }),
          /* @__PURE__ */ jsx("span", { className: "text-sm", children: "I have read and agree to the terms of this NDA. I understand my access is logged." })
        ] }),
        submitError && /* @__PURE__ */ jsx("p", { className: "mt-3 text-xs text-destructive", children: submitError }),
        /* @__PURE__ */ jsx("button", { disabled: !formData.agreedToNda || isSubmitting, onClick: handleSignAndEnter, className: "mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-50", children: isSubmitting ? "Processing…" : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { children: "Sign & enter deal room" }),
          " ",
          /* @__PURE__ */ jsx(Lock, { className: "h-4 w-4" })
        ] }) })
      ] }),
      step === 3 && /* @__PURE__ */ jsxs("div", { className: "text-center py-12", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success", children: /* @__PURE__ */ jsx(Check, { className: "h-7 w-7" }) }),
        /* @__PURE__ */ jsx("h2", { className: "mt-5 text-2xl font-semibold tracking-tight", children: "You're in." }),
        /* @__PURE__ */ jsxs("p", { className: "mt-2 text-sm text-muted-foreground", children: [
          "Welcome to the ",
          companyName,
          " deal room."
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => navigate({
          to: "/app/deal-room/$id",
          params: {
            id: invite.deal_room_id
          }
        }), className: "mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2", children: [
          "Enter deal room ",
          /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })
        ] })
      ] })
    ] }) })
  ] });
}
export {
  JoinFlow as component
};
