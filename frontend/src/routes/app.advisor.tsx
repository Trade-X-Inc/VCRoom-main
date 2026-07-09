import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle, FileUp, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { fetchVerificationStatus } from "@/lib/verification-fn";
import { useState } from "react";
import { toast } from "sonner";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const Route = createFileRoute("/app/advisor")({
  component: VerificationPage,
});

function VerificationPage() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [licenseChecking, setLicenseChecking] = useState(false);

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
      const { runTier1Check } = await import("@/lib/verification-fn");
      const result = await runTier1Check({ data: { startup_id: startup.id, caller_user_id: user.id } });
      await refetch();
      if (result.error) {
        toast.error(result.error);
      } else if (result.tier1_passed) {
        toast.success("Identity confirmed — all four checks passed");
      } else {
        toast.info("Check complete — see results below for what didn't pass");
      }
    } catch {
      toast.error("Verification failed — try again");
    } finally {
      setRunning(false);
    }
  };

  const handleLicenseUpload = async (file: File) => {
    if (!startup?.id || !user?.id || licenseChecking) return;
    setLicenseChecking(true);
    try {
      const isImage = /\.(png|jpe?g|webp)$/i.test(file.name);
      const payload: Record<string, unknown> = {
        startup_id: startup.id,
        caller_user_id: user.id,
        document_name: file.name,
      };
      if (isImage) {
        payload.image_data_url = await fileToDataUrl(file);
      } else {
        const { extractDocumentText } = await import("@/lib/document-extractor");
        payload.document_text = await extractDocumentText(file, file.name);
      }
      const { verifyTradeLicense } = await import("@/lib/verification-fn");
      const r = await verifyTradeLicense({ data: payload as any });
      await refetch();
      if (r.passed) {
        toast.success(`License accepted — issued by ${r.authority}, valid until ${r.expiry}`);
      } else {
        toast.error(r.detail || r.error || "License check failed");
      }
    } catch {
      toast.error("License check failed — try again");
    } finally {
      setLicenseChecking(false);
    }
  };

  const tier = verif?.current_tier ?? 0;

  const checks = verif
    ? [
        { label: "Email domain matches website", passed: verif.tier1_email_match, detail: verif.tier1_email_detail },
        { label: "Website mentions your company", passed: verif.tier1_website_match, detail: verif.tier1_website_detail },
        {
          label: "Found in a public company registry",
          passed: verif.tier1_registry_match,
          detail: verif.tier1_registry_match && verif.tier1_registry_source
            ? `${verif.tier1_registry_detail ?? ""} Source: ${verif.tier1_registry_source}.`
            : verif.tier1_registry_detail,
        },
        { label: "Real domain infrastructure", passed: verif.tier1_infra_match, detail: verif.tier1_infra_detail },
      ]
    : [];

  const hasNewResults = checks.some((c) => c.passed !== null && c.passed !== undefined);

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
              Every badge is backed by a specific, checkable fact — investors see exactly what was confirmed.
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="bg-card border border-border/60 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">{startup?.company_name ?? "Your company"}</div>
              <div className="mt-1">
                <VerificationBadge tier={tier} size="md" checkedAt={verif?.tier1_checked_at ?? null} />
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
              {running ? "Running…" : hasNewResults ? "Re-run identity check" : "Run identity check"}
            </button>
          </div>

          <div className="text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-4">
            Tier 1 — Identity Confirmed requires <strong className="text-foreground">all four</strong> checks to pass.
            There is no partial credit: each check is a specific fact we can defend to an investor.
          </div>

          {hasNewResults && (
            <div className="space-y-3">
              {checks.map(({ label, passed, detail }) => (
                <div key={label} className="flex items-start gap-2.5 text-sm rounded-lg border border-border/60 px-3.5 py-3">
                  {passed ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#10B981" }} />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: passed === false ? "#EF4444" : "#6B7280" }} />
                  )}
                  <div className="min-w-0">
                    <div className={passed ? "text-foreground font-medium" : "text-muted-foreground font-medium"}>{label}</div>
                    {detail && <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{detail}</div>}
                  </div>
                </div>
              ))}
              {verif?.tier1_registry_match === false && (
                <label className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 cursor-pointer text-sm" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  {licenseChecking
                    ? <Loader2 className="h-4 w-4 shrink-0 mt-0.5 animate-spin text-brand" />
                    : <FileUp className="h-4 w-4 shrink-0 mt-0.5 text-brand" />}
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">
                      {licenseChecking ? "Checking your license…" : "Not in the registries we can query? Upload your trade license"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      AI reads the license and must find your exact company name, a future expiry date, and the
                      issuing authority (DED, DIFC, ADGM, RAKEZ…). A valid license satisfies this check.
                    </div>
                  </div>
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.docx"
                    disabled={licenseChecking}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLicenseUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              {verif?.tier1_checked_at && (
                <div className="text-[11px] text-muted-foreground">
                  Last checked {new Date(verif.tier1_checked_at).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          )}

          {!hasNewResults && (
            <div className="text-sm text-muted-foreground">
              No identity check has been run yet. The check confirms four facts automatically: your business
              email matches your domain, your website mentions your company, your company appears in a public
              registry, and your domain has real mail infrastructure and history.
            </div>
          )}
        </div>

        {/* Tier 2 pointer */}
        <div className="mt-4 bg-card border border-border/60 rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Tier 2 — Claims Verified</div>
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Back every number you state with a document the AI confirms supports that specific claim.
              Requires Tier 1, then at least 3 verified claims including 1 financial.
            </div>
          </div>
          <Link
            to={"/app/claims" as any}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Manage claims →
          </Link>
        </div>
      </div>
    </div>
  );
}
