import { createFileRoute, Link, Outlet, useRouterState, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Bell, Shield, User, Loader2, Camera, HelpCircle, Info } from "lucide-react";
import { VerificationSection } from "@/components/app/VerificationSection";
import { FounderHelpGuide, AboutSection } from "@/components/app/HelpGuide";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/settings")({
  component: SettingsLayout,
});

const routeTabs = [
  { to: "/app/settings", label: "Profile", icon: User, exact: true },
  { to: "/app/settings/notifications", label: "Notifications", icon: Bell },
  { to: "/app/settings/security", label: "Security", icon: Shield },
];

const inlineTabs = [
  { id: "help", label: "How to use", icon: HelpCircle },
  { id: "about", label: "About", icon: Info },
];

function SettingsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useSearch({ strict: false }) as { tab?: string };
  const [inlineTab, setInlineTab] = useState<"help" | "about" | null>(
    search?.tab === "help" ? "help" : search?.tab === "about" ? "about" : null
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-brand" />
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </div>

      <div className="flex gap-6 lg:gap-8">
        {/* Left sidebar — 200px fixed */}
        <nav className="w-[200px] shrink-0 space-y-1">
          {routeTabs.map((t) => {
            const active = inlineTab === null && (t.exact ? path === t.to : path.startsWith(t.to));
            return (
              <Link
                key={t.to}
                to={t.to as any}
                onClick={() => setInlineTab(null)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <t.icon className={cn("h-4 w-4", active && "text-brand")} />
                {t.label}
              </Link>
            );
          })}

          <div className="my-2 border-t border-border/40" />

          {inlineTabs.map((t) => {
            const active = inlineTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setInlineTab(t.id as "help" | "about")}
                data-testid={`settings-tab-${t.id}`}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors text-left",
                  active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <t.icon className={cn("h-4 w-4", active && "text-brand")} />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          {inlineTab === "help" && <FounderHelpGuide />}
          {inlineTab === "about" && <AboutSection />}
          {inlineTab === null && (
            path === "/app/settings" ? <ProfileSettings /> : <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared card wrapper ───────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
const disabledCls = "w-full rounded-md border border-border/40 bg-muted/40 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed";

// ── SECTION 1+2: Profile + Company ───────────────────────────────────────────
function ProfileSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isInvestor = user?.role === "investor";
  const fileRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Company state (founder only)
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState("");
  const [country, setCountry] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);

  // Load user profile
  const { data: userRow } = useQuery({
    queryKey: ["settings-user", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("full_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (userRow) {
      setFullName(userRow.full_name ?? "");
      setAvatarUrl(userRow.avatar_url ?? null);
    }
  }, [userRow]);

  // Load startup (founders)
  const { data: startup } = useQuery({
    queryKey: ["settings-startup", user?.id],
    enabled: !!user?.id && !isInvestor,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name, website, description, stage, country, profile_slug, founder_email, publicly_discoverable")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Discoverable toggle state (founders only)
  const [discoverable, setDiscoverable] = useState<boolean>(false);
  const [savingDiscoverable, setSavingDiscoverable] = useState(false);
  useEffect(() => {
    if (!isInvestor && startup) {
      setDiscoverable(startup.publicly_discoverable ?? false);
    }
  }, [startup, isInvestor]);

  // Load investor profile
  const { data: investorProfile } = useQuery({
    queryKey: ["settings-investor-profile", user?.id],
    enabled: !!user?.id && isInvestor,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("fund_name, website, geography")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!isInvestor && startup) {
      setCompanyName(startup.company_name ?? "");
      setWebsite(startup.website ?? "");
      setDescription(startup.description ?? "");
      setStage(startup.stage ?? "");
      setCountry(startup.country ?? "");
    } else if (isInvestor && investorProfile) {
      setCompanyName(investorProfile.fund_name ?? "");
      setWebsite(investorProfile.website ?? "");
      setCountry(investorProfile.geography ?? "");
    }
  }, [startup, investorProfile, isInvestor]);

  // Avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = urlData.publicUrl + `?v=${Date.now()}`;
      await supabase.from("users").update({ avatar_url: url }).eq("id", user.id);
      setAvatarUrl(url);
      qc.invalidateQueries({ queryKey: ["settings-user"] });
      toast.success("Avatar updated");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save profile
  const saveProfile = async () => {
    if (!user?.id) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["settings-user"] });
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Save company / investor details
  const saveCompany = async () => {
    if (!user?.id) return;
    setSavingCompany(true);
    try {
      if (isInvestor) {
        const { error } = await supabase
          .from("investor_profiles")
          .update({ fund_name: companyName.trim(), website: website.trim(), geography: country.trim(), updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        if (!startup?.id) throw new Error("No startup found. Create a company profile first.");
        const prevStage = startup.stage;
        const { error } = await supabase
          .from("startups")
          .update({ company_name: companyName.trim(), website: website.trim(), description: description.trim(), stage: stage || null, country: country.trim(), updated_at: new Date().toISOString() })
          .eq("id", startup.id);
        if (error) throw error;
        // Auto-trigger coaching when stage changes (fire and forget)
        if (stage && stage !== prevStage && user?.id) {
          supabase.auth.getSession().then(({ data: authData }) => {
            const jwt = authData?.session?.access_token ?? "";
            import("@/lib/coaching-fn").then(({ runFounderCoaching }) => {
              runFounderCoaching({
                startupId: startup.id,
                userId: user.id,
                triggerType: "stage_change",
                triggerData: { new_stage: stage },
                jwt,
              }).catch(() => {});
            });
          });
        }
      }
      qc.invalidateQueries({ queryKey: ["settings-startup", "settings-investor-profile"] });
      toast.success("Saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSavingCompany(false);
    }
  };

  const initials = fullName ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="space-y-5">
      {/* Section 1 — Profile */}
      <Card title="Profile">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-gradient-brand flex items-center justify-center text-brand-foreground font-semibold text-lg shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border border-border/60 grid place-items-center hover:bg-accent transition-colors"
            >
              {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3 text-muted-foreground" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <div className="text-sm font-medium">{fullName || user?.email}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              <span className="inline-block px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium capitalize">{user?.role ?? "founder"}</span>
            </div>
          </div>
        </div>

        <Field label="Full name">
          <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
        </Field>

        <Field label="Email address">
          <input className={disabledCls} value={user?.email ?? ""} disabled readOnly />
          <p className="text-[11px] text-muted-foreground mt-1">Email cannot be changed. Contact support if needed.</p>
        </Field>

        <div className="flex justify-end pt-1">
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand text-brand-foreground px-4 py-2 text-sm font-medium hover:bg-brand/90 disabled:opacity-60 transition-colors"
          >
            {savingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save profile
          </button>
        </div>
      </Card>

      {/* Section 2 — Company / Fund */}
      <Card title={isInvestor ? "Fund details" : "Company info"}>
        <Field label={isInvestor ? "Fund name" : "Company name"}>
          <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={isInvestor ? "Acme Ventures" : "Acme Inc."} />
        </Field>

        <Field label="Website">
          <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" type="url" />
        </Field>

        {!isInvestor && (
          <>
            <Field label="One-liner description">
              <textarea
                className={inputCls + " resize-none"}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What your company does in one sentence"
              />
            </Field>

            <Field label="Funding stage">
              <select className={inputCls} value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="">Select stage…</option>
                {["Pre-seed", "Seed", "Series A", "Series B", "Series C+", "Growth"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </>
        )}

        <Field label="Location / country">
          <input className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="San Francisco, USA" />
        </Field>

        <div className="flex justify-end pt-1">
          <button
            onClick={saveCompany}
            disabled={savingCompany}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand text-brand-foreground px-4 py-2 text-sm font-medium hover:bg-brand/90 disabled:opacity-60 transition-colors"
          >
            {savingCompany && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isInvestor ? "Save fund details" : "Save company info"}
          </button>
        </div>
      </Card>

      {/* Publicly discoverable toggle — founders only */}
      {!isInvestor && startup?.id && (
        <Card title="Profile visibility">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">Publicly discoverable</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                When off, only investors you've connected with directly can see your full profile. Your company won't appear in general search or the directory. When on, investors browsing the platform can find you.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={discoverable}
              disabled={savingDiscoverable}
              onClick={async () => {
                if (!startup?.id) return;
                const next = !discoverable;
                setSavingDiscoverable(true);
                try {
                  const { error } = await supabase
                    .from("startups")
                    .update({ publicly_discoverable: next, updated_at: new Date().toISOString() })
                    .eq("id", startup.id);
                  if (error) throw error;
                  setDiscoverable(next);
                  qc.invalidateQueries({ queryKey: ["settings-startup", user?.id] });
                  toast.success(next ? "Profile is now discoverable" : "Profile hidden from general search");
                } catch (err: any) {
                  toast.error(err.message || "Failed to update");
                } finally {
                  setSavingDiscoverable(false);
                }
              }}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-background disabled:opacity-60",
                discoverable ? "bg-brand" : "bg-muted"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200",
                discoverable ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>
          <div className={cn("text-xs px-2 py-1 rounded-md w-fit font-medium", discoverable ? "bg-green-500/10 text-green-400" : "bg-muted/60 text-muted-foreground")}>
            {savingDiscoverable ? "Saving…" : discoverable ? "Discoverable — appears in directory and search" : "Hidden — reachable only via direct connection"}
          </div>
        </Card>
      )}

      {/* Verification section — founders and investors */}
      {user?.id && (isInvestor ? true : !!startup?.id) && (
        <section className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
          <VerificationSection
            entityType={isInvestor ? "investor" : "founder"}
            entityId={isInvestor ? user.id : startup!.id}
            userId={user.id}
            userEmail={user?.email ?? ""}
            displayName={fullName || (isInvestor ? "Investor" : startup?.company_name ?? "Founder")}
            verifySlug={isInvestor ? undefined : (startup?.profile_slug ?? undefined)}
          />
        </section>
      )}
    </div>
  );
}
