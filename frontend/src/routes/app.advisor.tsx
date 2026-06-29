import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { fetchVerificationStatus, runVerification } from "@/lib/verification-fn";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/advisor")({
  component: VerificationPage,
});

function VerificationPage() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);

  const { data: startup } = useQuery({
    queryKey: ["advisor-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: verif, refetch } = useQuery({
    queryKey: ["advisor-verif", startup?.id],
    enabled: !!startup?.id,
    queryFn: () => fetchVerificationStatus(startup!.id),
  });

  const handleRun = async () => {
    if (!startup?.id || !user?.id) return;
    setRunning(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token ?? "";
      await runVerification({ startupId: startup.id, userId: user.id, jwt });
      await refetch();
      toast.success("Verification complete");
    } catch {
      toast.error("Verification failed — try again");
    } finally {
      setRunning(false);
    }
  };

  const tier = verif?.current_tier ?? 0;
  const score = verif?.tier1_score ?? null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b border-border/60 bg-background/80 backdrop-blur-xl px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Verification</h1>
            <div className="text-xs text-muted-foreground">
              Automated checks that build trust with investors.
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl">
        <div className="bg-card border border-border/60 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">{startup?.company_name ?? "Your company"}</div>
              <div className="mt-1">
                <VerificationBadge tier={tier} size="md" />
              </div>
            </div>
            <button
              onClick={handleRun}
              disabled={running || !startup?.id}
              data-testid="run-verification-btn"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: "#7C3AED" }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
              {running ? "Running…" : tier > 0 ? "Re-run check" : "Run check"}
            </button>
          </div>

          {verif && (
            <div className="space-y-3 border-t border-border/60 pt-4">
              {score !== null && (
                <div className="text-xs text-muted-foreground">
                  Trust score: {score}/100 — {score >= 60 ? "Checks passed" : "Some checks pending"}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Business email domain", value: verif.email_domain_matches, hint: "Use a business email for higher trust" },
                  { label: "Website reachable", value: verif.website_resolves, hint: "Your website could not be reached" },
                  { label: "LinkedIn format valid", value: verif.linkedin_valid, hint: "Add a valid LinkedIn URL to your profile" },
                  { label: "Registration document uploaded", value: verif.registry_confirmed, hint: "Upload your company registration document to verify your legal status" },
                ].map(({ label, value, hint }) => (
                  <div key={label} className="flex items-start gap-2 text-xs">
                    <span
                      className="h-2 w-2 rounded-full shrink-0 mt-0.5"
                      style={{ background: value ? "#10B981" : "#F59E0B" }}
                    />
                    <div>
                      <span className={value ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                      {!value && <div className="text-muted-foreground/60 mt-0.5 leading-tight">{hint}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!verif && (
            <div className="text-sm text-muted-foreground border-t border-border/60 pt-4">
              No verification has been run yet. Click "Run check" to build your trust profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
