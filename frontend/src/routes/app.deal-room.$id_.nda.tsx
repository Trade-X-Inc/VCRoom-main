import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase, logActivity } from "@/lib/supabase";
import { Logo } from "@/components/brand/Logo";
import { triggerNdaSignedEmail } from "@/lib/email/triggers";
import { generateNdaDocument } from "@/lib/nda-fn";

export const Route = createFileRoute("/app/deal-room/$id_/nda")({
  component: NdaPage,
});

function buildPreviewNdaText(
  startupName: string,
  founderName: string,
  signerName: string,
  date: string,
): string {
  return `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of ${date} by and between:

${founderName}, on behalf of ${startupName} (the "Company"), a venture seeking investment consideration; and

${signerName} (the "Recipient"), a party evaluating a potential relationship with the Company.

1. PURPOSE

The parties wish to explore a potential investment relationship between the Company and the Recipient. In connection with this evaluation, each party may disclose certain non-public, confidential, or proprietary information to the other.

2. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any non-public information relating to the actual or anticipated business, research, or development of the disclosing party, including but not limited to: financial data and projections, business plans, customer lists, intellectual property, technical specifications, product roadmaps, pricing strategies, personnel information, and any documents shared within this deal room.

3. OBLIGATIONS OF RECEIVING PARTY

The Recipient agrees to:
(a) Hold all Confidential Information in strict confidence;
(b) Not disclose any Confidential Information to third parties without prior written consent from the Company;
(c) Use the Confidential Information solely for the purpose of evaluating the Transaction;
(d) Protect the Confidential Information using at least the same degree of care applied to its own confidential information, but in no event less than reasonable care, and in any event no less than the standard of care that a prudent person would exercise to protect their own trade secrets.

4. EXCEPTIONS

These obligations do not apply to information that:
(a) Is or becomes publicly known through no breach of this Agreement;
(b) Was rightfully known to the Recipient prior to disclosure;
(c) Is independently developed by the Recipient without use of Confidential Information;
(d) Is required to be disclosed by applicable law or valid court order, provided the Recipient gives prompt notice where permitted by law, and provide reasonable prior notice to the disclosing party where legally permitted to allow them to seek a protective order.

5. MONITORING AND WATERMARKING

All materials accessed via the Hockystick deal room are electronically watermarked and access-logged. Activity within the deal room is monitored. Any breach of this Agreement may result in immediate revocation of access and legal action.

6. TERM

This Agreement remains in effect for three (3) years from the date of first execution by each respective party. All confidentiality obligations survive termination.

7. RETURN OR DESTRUCTION OF INFORMATION

Upon written request, the Recipient shall promptly return or destroy all Confidential Information and certify such action in writing.

8. NO LICENSE

Nothing herein grants the Recipient any rights in or to the Confidential Information except as expressly set forth.

9. GOVERNING LAW AND DISPUTE RESOLUTION

9.1 Governing Law
This Agreement and any disputes arising out of or in connection with it shall be governed by and construed in accordance with the laws of the Dubai International Financial Centre (DIFC), United Arab Emirates, without regard to its conflict of laws provisions.

9.2 Dispute Resolution — Negotiation
The parties shall first attempt to resolve any dispute, controversy, or claim arising out of or relating to this Agreement through good-faith negotiation for a period of thirty (30) days following written notice of the dispute.

9.3 Arbitration
If the dispute is not resolved through negotiation, it shall be finally settled by binding arbitration under the Rules of the Dubai International Arbitration Centre (DIAC), which rules are deemed incorporated by reference into this clause. The number of arbitrators shall be one (1) for claims below USD 500,000 and three (3) for claims of USD 500,000 or above. The seat of arbitration shall be Dubai, UAE. The language of arbitration shall be English.

9.4 Emergency Relief
Notwithstanding the foregoing, either party may seek interim or emergency injunctive relief from any court of competent jurisdiction to prevent irreparable harm pending the constitution of the arbitral tribunal. Seeking such relief shall not be deemed a waiver of the right to arbitrate.

9.5 International Parties
The parties expressly agree that the United Nations Convention on Contracts for the International Sale of Goods (CISG) shall not apply to this Agreement. For parties domiciled outside the UAE, this Agreement shall be enforceable in their home jurisdiction to the maximum extent permitted by applicable local law, and the parties waive any objection to the arbitral seat on grounds of inconvenience.

9.6 Recognition and Enforcement
The parties agree that any arbitral award rendered under this clause shall be final and binding, and may be entered as a judgment in any court of competent jurisdiction. Enforcement of awards shall be subject to the New York Convention on the Recognition and Enforcement of Foreign Arbitral Awards (1958), to which the UAE is a signatory.

10. ENTIRE AGREEMENT

This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements, whether oral or written.

— — —

Company: ${startupName}
Representative: ${founderName}
Accepting Party: ${signerName}
Date of Acceptance: ${date}

This agreement is executed electronically via Hockystick. By checking the acknowledgement box and clicking "Accept & Enter Deal Room", you agree to be legally bound by the terms above.`;
}

function NdaPage() {
  const { id: dealRoomId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  // Check if already accepted — redirect to deal room if so
  const { data: existingAcceptance, isLoading: checkingNda } = useQuery({
    queryKey: ["nda-acceptance", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("nda_acceptances")
        .select("id")
        .eq("deal_room_id", dealRoomId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  useEffect(() => {
    if (!checkingNda && existingAcceptance) {
      navigate({ to: "/app/deal-room/$id" as any, params: { id: dealRoomId } });
    }
  }, [checkingNda, existingAcceptance, navigate, dealRoomId]);

  // Load deal room + startup for NDA preview text
  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ["deal-room-nda", dealRoomId],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("deal_rooms")
        .select("*, startups(company_name, legal_entity_name, incorporated_in)")
        .eq("id", dealRoomId)
        .single();
      if (err) throw err;
      return data;
    },
  });

  // Load the founder member name for the preview
  const { data: founderMember } = useQuery({
    queryKey: ["deal-room-founder", dealRoomId],
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("users(full_name)")
        .eq("deal_room_id", dealRoomId)
        .eq("role", "founder")
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  // Load investor profile if signer is an investor (for company name at sign time)
  const { data: investorProfile } = useQuery({
    queryKey: ["investor-profile-nda", user?.id],
    enabled: !!user?.id && user?.role === "investor",
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("fund_name, your_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  const startupName = (room as any)?.startups?.company_name ?? "the Company";
  const founderName = (founderMember as any)?.users?.full_name ?? "its authorized representative";
  const signerName = user?.fullName ?? "Signing Party";
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const ndaPreviewText = buildPreviewNdaText(startupName, founderName, signerName, today);

  const handleAccept = async () => {
    if (!user?.id || !agreed) return;
    setAccepting(true);
    setError("");
    try {
      const role = user.role ?? "investor";

      // Resolve signer_company from live profile data at sign time
      let signerCompany = "";
      if (role === "founder") {
        signerCompany = startupName;
      } else if (role === "investor") {
        signerCompany = investorProfile?.fund_name ?? "";
      }

      const { error: insertErr } = await supabase.from("nda_acceptances").insert({
        deal_room_id: dealRoomId,
        user_id: user.id,
        role,
        user_agent: navigator.userAgent,
        nda_html: ndaPreviewText,
        signer_full_name: user.fullName ?? signerName,
        signer_company: signerCompany,
      });
      if (insertErr) throw insertErr;

      // Badge evaluation — fire-and-forget on this write event
      import("@/lib/badge-award-engine").then((m) => m.evaluateAndAwardBadges({ data: { deal_room_id: dealRoomId } })).catch(() => {});

      const { error: memberErr } = await supabase.from("deal_room_members").upsert(
        {
          deal_room_id: dealRoomId,
          user_id: user.id,
          role,
          accepted_at: new Date().toISOString(),
        },
        { onConflict: "deal_room_id,user_id" },
      );

      await logActivity(dealRoomId, user.id, "Signed the NDA");

      // Regenerate the canonical multi-party NDA document (fire-and-forget — don't block navigation)
      generateNdaDocument({ data: { dealRoomId } })
        .then(() => {
          // Invalidate so Overview + Vault panels pick up the new version
          queryClient.invalidateQueries({ queryKey: ["nda-document", dealRoomId] });
        })
        .catch((e) => console.warn("[nda] generateNdaDocument failed:", e));

      triggerNdaSignedEmail({
        data: { dealRoomId, investorUserId: user.id },
      }).catch(() => {});

      queryClient.setQueryData(
        ["nda-acceptance", dealRoomId, user.id],
        { id: "accepted", accepted_at: new Date().toISOString() },
      );
      navigate({ to: "/app/deal-room/$id" as any, params: { id: dealRoomId } });
    } catch {
      setError("Could not save your acceptance. Please try again.");
      setAccepting(false);
    }
  };

  if (checkingNda || roomLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] grid place-items-center">
        <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-center mb-8">
          <Logo withWordmark />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden">
          <div className="px-8 py-6 border-b border-border/60 flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent border border-brand/20">
              <Shield className="h-6 w-6 text-brand" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Non-Disclosure Agreement</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Review and sign to access this deal room.
              </p>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-border/60 bg-background p-3">
                <div className="text-muted-foreground mb-0.5">Company</div>
                <div className="font-medium truncate">{startupName}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background p-3">
                <div className="text-muted-foreground mb-0.5">Signing as</div>
                <div className="font-medium truncate">{signerName}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background p-3">
                <div className="text-muted-foreground mb-0.5">Version</div>
                <div className="font-medium">v1.0 · {today}</div>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Agreement text
              </div>
              <div className="h-64 overflow-y-auto rounded-xl border border-border/60 bg-background p-5 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {ndaPreviewText}
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)] cursor-pointer"
              />
              <span className="text-sm leading-snug">
                I have read and agree to the terms of this Non-Disclosure Agreement. I understand
                this is a legally binding agreement executed electronically.
              </span>
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              onClick={handleAccept}
              disabled={!agreed || accepting || !user?.id}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.01]"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Accept &amp; Enter Deal Room
                </>
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground pb-2">
              Your acceptance is timestamped and logged with your browser&apos;s user-agent string.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
