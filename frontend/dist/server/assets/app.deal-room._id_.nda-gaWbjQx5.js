import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Shield, Loader2, Lock } from "lucide-react";
import { f as Route, u as useAuth, s as supabase, l as logActivity } from "./router-DOcN9fVX.js";
import { L as Logo } from "./Logo-CIkq6vsm.js";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
function buildNdaText(startupName, founderName, investorName, date) {
  return `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of ${date} by and between:

${founderName}, on behalf of ${startupName} (the "Company"), a venture seeking investment consideration; and

${investorName} (the "Recipient"), an investor evaluating potential investment opportunities.

1. PURPOSE

The parties wish to explore a potential investment relationship between the Company and the Recipient (the "Transaction"). In connection with this evaluation, each party may disclose certain non-public, confidential, or proprietary information to the other.

2. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any non-public information relating to the actual or anticipated business, research, or development of the disclosing party, including but not limited to: financial data and projections, business plans, customer lists, intellectual property, technical specifications, product roadmaps, pricing strategies, personnel information, and any documents shared within this deal room.

3. OBLIGATIONS OF RECEIVING PARTY

The Recipient agrees to:
(a) Hold all Confidential Information in strict confidence;
(b) Not disclose any Confidential Information to third parties without prior written consent from the Company;
(c) Use the Confidential Information solely for the purpose of evaluating the Transaction;
(d) Protect the Confidential Information using at least the same degree of care applied to its own confidential information, but in no event less than reasonable care.

4. EXCEPTIONS

These obligations do not apply to information that:
(a) Is or becomes publicly known through no breach of this Agreement;
(b) Was rightfully known to the Recipient prior to disclosure;
(c) Is independently developed by the Recipient without use of Confidential Information;
(d) Is required to be disclosed by applicable law or valid court order, provided the Recipient gives prompt notice to the Company where permitted by law.

5. MONITORING AND WATERMARKING

All materials accessed via the Venture Room deal room are electronically watermarked and access-logged. Activity within the deal room is monitored. Any breach of this Agreement may result in immediate revocation of access and legal action.

6. TERM

This Agreement remains in effect for two (2) years from the date of execution. All confidentiality obligations survive termination.

7. RETURN OR DESTRUCTION OF INFORMATION

Upon written request, the Recipient shall promptly return or destroy all Confidential Information and certify such action in writing.

8. NO LICENSE

Nothing herein grants the Recipient any rights in or to the Confidential Information except as expressly set forth.

9. GOVERNING LAW

This Agreement is governed by applicable law. Any disputes shall be subject to the exclusive jurisdiction of courts in the jurisdiction where the Company is domiciled.

10. ENTIRE AGREEMENT

This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements, whether oral or written.

— — —

Company: ${startupName}
Representative: ${founderName}
Accepting Party: ${investorName}
Date of Acceptance: ${date}

This agreement is executed electronically via Venture Room. By checking the acknowledgement box and clicking "Accept & Enter Deal Room", you agree to be legally bound by the terms above.`;
}
function NdaPage() {
  const {
    id: dealRoomId
  } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    user
  } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const {
    data: existingAcceptance,
    isLoading: checkingNda
  } = useQuery({
    queryKey: ["nda-acceptance", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("nda_acceptances").select("id").eq("deal_room_id", dealRoomId).eq("user_id", user.id).maybeSingle();
      return data ?? null;
    }
  });
  useEffect(() => {
    if (!checkingNda && existingAcceptance) {
      navigate({
        to: "/app/deal-room/$id",
        params: {
          id: dealRoomId
        }
      });
    }
  }, [checkingNda, existingAcceptance, navigate, dealRoomId]);
  const {
    data: room,
    isLoading: roomLoading
  } = useQuery({
    queryKey: ["deal-room", dealRoomId],
    queryFn: async () => {
      const {
        data,
        error: err
      } = await supabase.from("deal_rooms").select("*, startups(company_name)").eq("id", dealRoomId).single();
      if (err) throw err;
      return data;
    }
  });
  const {
    data: founderMember
  } = useQuery({
    queryKey: ["deal-room-founder", dealRoomId],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("deal_room_members").select("users(full_name)").eq("deal_room_id", dealRoomId).eq("role", "founder").limit(1).maybeSingle();
      return data ?? null;
    }
  });
  const startupName = room?.startups?.company_name ?? "the Company";
  const founderName = founderMember?.users?.full_name ?? "its authorized representative";
  const investorName = user?.name ?? "Investor";
  const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const ndaText = buildNdaText(startupName, founderName, investorName, today);
  const handleAccept = async () => {
    if (!user?.id || !agreed) return;
    setAccepting(true);
    setError("");
    try {
      const role = user.role ?? "investor";
      const {
        error: insertErr
      } = await supabase.from("nda_acceptances").insert({
        deal_room_id: dealRoomId,
        user_id: user.id,
        role,
        user_agent: navigator.userAgent,
        nda_html: ndaText
      });
      if (insertErr) throw insertErr;
      await supabase.from("deal_room_members").upsert({
        deal_room_id: dealRoomId,
        user_id: user.id,
        role,
        accepted_at: (/* @__PURE__ */ new Date()).toISOString()
      }, {
        onConflict: "deal_room_id,user_id"
      });
      await logActivity(dealRoomId, user.id, "Signed the NDA");
      queryClient.setQueryData(["nda-acceptance", dealRoomId, user.id], {
        id: "accepted",
        accepted_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      navigate({
        to: "/app/deal-room/$id",
        params: {
          id: dealRoomId
        }
      });
    } catch {
      setError("Could not save your acceptance. Please try again.");
      setAccepting(false);
    }
  };
  if (checkingNda || roomLoading) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-[calc(100vh-4rem)] grid place-items-center", children: /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground animate-pulse", children: "Loading…" }) });
  }
  return /* @__PURE__ */ jsx("div", { className: "min-h-[calc(100vh-4rem)] bg-muted/30 py-10 px-4", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl", children: [
    /* @__PURE__ */ jsx("div", { className: "flex justify-center mb-8", children: /* @__PURE__ */ jsx(Logo, { withWordmark: true }) }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "px-8 py-6 border-b border-border/60 flex items-center gap-4", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/10 border border-brand/20", children: /* @__PURE__ */ jsx(Shield, { className: "h-6 w-6 text-brand" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-xl font-semibold tracking-tight", children: "Non-Disclosure Agreement" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mt-0.5", children: "Review and sign to access this deal room." })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "px-8 py-6 space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-3 text-xs", children: [
          /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-background p-3", children: [
            /* @__PURE__ */ jsx("div", { className: "text-muted-foreground mb-0.5", children: "Company" }),
            /* @__PURE__ */ jsx("div", { className: "font-medium truncate", children: startupName })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-background p-3", children: [
            /* @__PURE__ */ jsx("div", { className: "text-muted-foreground mb-0.5", children: "Signing as" }),
            /* @__PURE__ */ jsx("div", { className: "font-medium truncate", children: investorName })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-background p-3", children: [
            /* @__PURE__ */ jsx("div", { className: "text-muted-foreground mb-0.5", children: "Version" }),
            /* @__PURE__ */ jsxs("div", { className: "font-medium", children: [
              "v1.0 · ",
              today
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2", children: "Agreement text" }),
          /* @__PURE__ */ jsx("div", { className: "h-64 overflow-y-auto rounded-xl border border-border/60 bg-background p-5 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap", children: ndaText })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex items-start gap-3 cursor-pointer", children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: agreed, onChange: (e) => setAgreed(e.target.checked), className: "mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)] cursor-pointer" }),
          /* @__PURE__ */ jsx("span", { className: "text-sm leading-snug", children: "I have read and agree to the terms of this Non-Disclosure Agreement. I understand this is a legally binding agreement executed electronically." })
        ] }),
        error && /* @__PURE__ */ jsx("p", { className: "text-sm text-destructive", children: error }),
        /* @__PURE__ */ jsx("button", { onClick: handleAccept, disabled: !agreed || accepting || !user?.id, className: "w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.01]", children: accepting ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }),
          " Saving…"
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Lock, { className: "h-4 w-4" }),
          " Accept & Enter Deal Room"
        ] }) }),
        /* @__PURE__ */ jsx("p", { className: "text-center text-xs text-muted-foreground pb-2", children: "Your acceptance is timestamped and logged with your browser's user-agent string." })
      ] })
    ] })
  ] }) });
}
export {
  NdaPage as component
};
