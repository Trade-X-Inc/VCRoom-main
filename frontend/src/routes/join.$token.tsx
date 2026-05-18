import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { ShieldCheck, ArrowRight, Lock, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/join/$token")({
  component: JoinFlow,
});

interface InviteInfo {
  token: string;
  deal_room_id: string;
  email: string | null;
  role: string;
  invited_by: string;
  expires_at: string;
  deal_rooms: {
    id: string;
    startups: { company_name: string } | null;
  } | null;
}

function JoinFlow() {
  const { token } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    fullName: "",
    designation: "",
    company: "",
    country: "",
    agreedToNda: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    async function loadInvite() {
      console.log('Token from URL:', token);
      const { data, error } = await supabase
        .from("invites")
        .select("token, deal_room_id, email, role, invited_by, expires_at, deal_rooms(id, startups(company_name))")
        .eq("token", token)
        .is("accepted_at", null)
        .single();

      console.log('Invite query result:', data, error);

      if (error || !data) {
        setLoadError("This invite link is invalid or has already been used.");
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setLoadError("This invite link has expired. Please request a new one.");
        return;
      }
      setInvite(data as InviteInfo);
      if (user?.fullName) {
        setFormData((f) => ({ ...f, fullName: user.fullName }));
        // Already logged in — skip profile step, go straight to NDA
        setStep(2);
      }
    }
    loadInvite();
  }, [token, user?.fullName]);

  const companyName =
    invite?.deal_rooms?.startups?.company_name ?? "the startup";

  const handleSignAndEnter = async () => {
    if (!formData.agreedToNda || !invite) return;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      let userId = user?.id;

      // If not logged in, require sign in
      if (!userId) {
        throw new Error("Please sign in before accepting this invite.");
      }

      // Insert member record — plain insert, ignore if already a member
      await supabase.from("deal_room_members").insert({
        deal_room_id: invite.deal_room_id,
        user_id: userId,
        role: "investor",
      });

      // Mark deal room as active now that investor has accepted
      await supabase
        .from("deal_rooms")
        .update({ status: "active" })
        .eq("id", invite.deal_room_id);

      // Mark invite as accepted
      await supabase
        .from("invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("token", token);

      // Invalidate deal flow cache so new room appears immediately
      await queryClient.invalidateQueries();

      // Auto-redirect based on role
      const destination = user?.role === "investor" ? "/app/investor/" : "/app/";
      void navigate({ to: destination as any });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-semibold">{loadError}</h2>
          <p className="mt-2 text-sm text-muted-foreground">Contact the deal room owner for a new invite link.</p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">Loading invite…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-[1fr_480px]">
      <div className="hidden lg:block relative overflow-hidden bg-primary text-primary-foreground p-12">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="absolute inset-0 noise opacity-40" />
        <div className="relative">
          <Logo />
          <div className="mt-32 max-w-md">
            <h1 className="text-4xl font-semibold tracking-[-0.03em] leading-tight">
              You've been invited to a deal room.
            </h1>
            <p className="mt-4 text-primary-foreground/70">
              {companyName} has invited you to evaluate their deal. Sign the NDA to access documents, Q&amp;A,
              and the full diligence packet.
            </p>
            <div className="mt-10 space-y-3 text-sm">
              {["Bank-grade encryption", "Watermarked documents", "Audit trail on every action"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-primary-foreground/80">
                  <Check className="h-4 w-4 text-success" /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-gradient-brand" : "bg-muted"}`} />
            ))}
          </div>

          {step === 1 && (
            <>
              <h2 className="text-2xl font-semibold tracking-tight">Tell us who you are</h2>
              <p className="mt-1 text-sm text-muted-foreground">This information is shared with {companyName}.</p>
              <div className="mt-6 space-y-3">
                {[
                  { label: "Full name", key: "fullName" },
                  { label: "Designation", key: "designation" },
                  { label: "Company", key: "company" },
                  { label: "Country", key: "country" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground">{label}</label>
                    <input
                      value={formData[key as keyof typeof formData] as string}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!formData.fullName.trim()}
                className="mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Mutual NDA
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Sign the NDA</h2>
              <p className="mt-1 text-sm text-muted-foreground">Auto-filled with the details you just provided.</p>
              <div className="mt-5 rounded-xl border border-border/60 bg-card p-5 max-h-[280px] overflow-y-auto text-xs leading-relaxed text-muted-foreground">
                <p className="text-foreground font-medium mb-2">Mutual Non-Disclosure Agreement</p>
                <p>
                  This Agreement is entered into between{" "}
                  <span className="text-foreground font-medium">{companyName}</span> ("Discloser") and{" "}
                  <span className="text-foreground font-medium">
                    {formData.fullName}{formData.company ? `, ${formData.company}` : ""}
                  </span>{" "}
                  ("Recipient") as of {new Date().toLocaleDateString()}.
                </p>
                <p className="mt-2">
                  The Recipient agrees to hold all Confidential Information in strict confidence, use it solely
                  for the purpose of evaluating a potential investment, and not disclose it to any third party
                  without prior written consent…
                </p>
                <p className="mt-2">
                  This Agreement shall remain in effect for a period of two (2) years from the date of execution.
                </p>
              </div>
              <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreedToNda}
                  onChange={(e) => setFormData({ ...formData, agreedToNda: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                />
                <span className="text-sm">I have read and agree to the terms of this NDA. I understand my access is logged.</span>
              </label>
              {submitError && <p className="mt-3 text-xs text-destructive">{submitError}</p>}
              <button
                disabled={!formData.agreedToNda || isSubmitting}
                onClick={handleSignAndEnter}
                className="mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? "Processing…" : <><span>Sign &amp; enter deal room</span> <Lock className="h-4 w-4" /></>}
              </button>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-12">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">You're in.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Welcome to the {companyName} deal room.</p>
              <button
                onClick={() =>
                  navigate({
                    to: "/app/deal-room/$id" as any,
                    params: { id: invite!.deal_room_id } as any,
                  })
                }
                className="mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2"
              >
                Enter deal room <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
