import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { ShieldCheck, ArrowRight, Lock, Check } from "lucide-react";

export const Route = createFileRoute("/join/$token")({
  component: JoinFlow,
});

function JoinFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-[1fr_480px]">
      <div className="hidden lg:block relative overflow-hidden bg-primary text-primary-foreground p-12">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="absolute inset-0 noise opacity-40" />
        <div className="relative">
          <Logo />
          <div className="mt-32 max-w-md">
            <h1 className="text-4xl font-semibold tracking-[-0.03em] leading-tight">You've been invited to a deal room.</h1>
            <p className="mt-4 text-primary-foreground/70">Atlas Robotics has invited you to evaluate their Series A. Sign the NDA to access documents, Q&amp;A, and the full diligence packet.</p>
            <div className="mt-10 space-y-3 text-sm">
              {["Bank-grade encryption", "Watermarked documents", "Audit trail on every action"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-primary-foreground/80"><Check className="h-4 w-4 text-success" /> {t}</div>
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
              <p className="mt-1 text-sm text-muted-foreground">This information is shared with Atlas Robotics.</p>
              <div className="mt-6 space-y-3">
                {[["Full name", "Sara Khan"], ["Designation", "Partner"], ["Company", "NEA"], ["Country", "United States"]].map(([l, p]) => (
                  <div key={l}>
                    <label className="text-xs text-muted-foreground">{l}</label>
                    <input defaultValue={p} className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" />
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2">
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
                <p>This Agreement is entered into between <span className="text-foreground font-medium">Atlas Robotics, Inc.</span> ("Discloser") and <span className="text-foreground font-medium">Sara Khan, NEA</span> ("Recipient") as of {new Date().toLocaleDateString()}.</p>
                <p className="mt-2">The Recipient agrees to hold all Confidential Information in strict confidence, use it solely for the purpose of evaluating a potential investment, and not disclose it to any third party without prior written consent…</p>
                <p className="mt-2">This Agreement shall remain in effect for a period of two (2) years from the date of execution.</p>
              </div>
              <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
                <span className="text-sm">I have read and agree to the terms of this NDA. I understand my access is logged.</span>
              </label>
              <button onClick={() => setStep(3)} className="mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2">
                Sign &amp; enter deal room <Lock className="h-4 w-4" />
              </button>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-12">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">You're in.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Welcome to the Atlas Robotics deal room.</p>
              <button onClick={() => navigate({ to: "/app/deal-room/$id" as any, params: { id: "dr_001" } as any })} className="mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2">
                Enter deal room <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
