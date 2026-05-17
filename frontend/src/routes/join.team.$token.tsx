import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { Users, ArrowRight, Check, AlertTriangle, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/join/team/$token")({
  component: JoinTeamFlow,
});

interface TeamInviteInfo {
  token: string;
  email: string | null;
  role: string;
  invited_by: string;
  expires_at: string;
  companyName: string;
}

function JoinTeamFlow() {
  const { token } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<TeamInviteInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState("");

  useEffect(() => {
    async function loadInvite() {
      const { data, error } = await supabase
        .from("invites")
        .select("token, email, role, invited_by, expires_at")
        .eq("token", token)
        .is("deal_room_id", null)
        .is("accepted_at", null)
        .single();

      if (error || !data) {
        setLoadError("This invite link is invalid or has already been used.");
        return;
      }
      if (new Date(data.expires_at) < new Date()) {
        setLoadError("This invite link has expired. Please request a new one.");
        return;
      }

      // Get company name from startup owned by the inviter
      const { data: startup } = await supabase
        .from("startups")
        .select("company_name")
        .eq("founder_id", data.invited_by)
        .maybeSingle();

      setInvite({
        ...data,
        companyName: startup?.company_name ?? "the team",
      });
    }
    loadInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!invite || !user?.id) return;
    setIsAccepting(true);
    setAcceptError("");

    try {
      // Mark invite accepted
      const { error: updateErr } = await supabase
        .from("invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("token", token);
      if (updateErr) throw updateErr;

      // Add to organization_members if table exists (best-effort)
      await supabase.from("organization_members").upsert(
        {
          user_id: user.id,
          invited_by: invite.invited_by,
          role: invite.role ?? "member",
          joined_at: new Date().toISOString(),
        },
        { onConflict: "user_id,invited_by" },
      ).then(({ error }) => {
        if (error) console.warn("organization_members upsert skipped:", error.message);
      });

      setAccepted(true);
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsAccepting(false);
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
          <p className="mt-2 text-sm text-muted-foreground">Contact the team owner for a new invite link.</p>
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
      {/* Left panel */}
      <div className="hidden lg:block relative overflow-hidden bg-primary text-primary-foreground p-12">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="absolute inset-0 noise opacity-40" />
        <div className="relative">
          <Logo />
          <div className="mt-32 max-w-md">
            <h1 className="text-4xl font-semibold tracking-[-0.03em] leading-tight">
              You've been invited to join the team.
            </h1>
            <p className="mt-4 text-primary-foreground/70">
              {invite.companyName} has invited you to collaborate on their fundraising campaign on VentureRoom.
            </p>
            <div className="mt-10 space-y-3 text-sm">
              {[
                "Manage VC leads together",
                "Share deal room access",
                "Coordinate meetings & tasks",
              ].map((t) => (
                <div key={t} className="flex items-center gap-2 text-primary-foreground/80">
                  <Check className="h-4 w-4 text-success" /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>

          {accepted ? (
            <div className="text-center py-12">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">Welcome to the team!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You've joined {invite.companyName} on VentureRoom.
              </p>
              <button
                onClick={() => navigate({ to: "/app" as any })}
                className="mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2"
              >
                Go to dashboard <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : !user ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs">
                <Users className="h-3.5 w-3.5 text-brand" /> Team invite
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                You've been invited to join {invite.companyName}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in or create an account to accept this invitation and join the team.
              </p>
              <button
                onClick={() =>
                  navigate({
                    to: "/sign-in" as any,
                    search: { redirect: `/join/team/${token}` } as any,
                  })
                }
                className="mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2"
              >
                <LogIn className="h-4 w-4" /> Sign in to accept
              </button>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs">
                <Users className="h-3.5 w-3.5 text-brand" /> Team invite
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                You've been invited to join {invite.companyName}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Accept this invitation to collaborate with {invite.companyName} on VentureRoom.
              </p>
              <div className="mt-6 rounded-xl border border-border/60 bg-card p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team</span>
                  <span className="font-medium">{invite.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium capitalize">{invite.role ?? "Member"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Joining as</span>
                  <span className="font-medium">{user.email}</span>
                </div>
              </div>
              {acceptError && <p className="mt-3 text-xs text-destructive">{acceptError}</p>}
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAccepting ? "Accepting…" : <><span>Accept invitation</span> <ArrowRight className="h-4 w-4" /></>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
