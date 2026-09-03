import { createFileRoute, Link, Outlet, useRouterState, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Bell, Shield, User, Loader2, Camera, HelpCircle, Info, CreditCard, Activity } from "lucide-react";
import { FounderHelpGuide, AboutSection } from "@/components/app/HelpGuide";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { LcsButton, LcsTextField, LcsSelectField } from "@/components/lcs";

export const Route = createFileRoute("/app/settings")({
  component: SettingsLayout,
});

const routeTabs = [
  { to: "/app/settings", label: "Profile", icon: User, exact: true },
  { to: "/app/settings/billing", label: "Billing", icon: CreditCard },
  { to: "/app/settings/notifications", label: "Notifications", icon: Bell },
  { to: "/app/settings/security", label: "Security", icon: Shield },
  { to: "/app/settings/activity", label: "Activity", icon: Activity },
];

const inlineTabs = [
  { id: "help", label: "How to use", icon: HelpCircle },
  { id: "about", label: "About", icon: Info },
];

// Group 4 structural note: this 200px fixed left nav rail + content-panel
// split is the same class of gap as app.messages.tsx's Team Chat workspace
// (a page-local secondary nav, not the outer app shell) — LCS's 10
// primitives have no defined pattern for this, same reasoning as the
// Group 3 subsystem 2 L2/L3 finding. Restyle-only: tokens applied to the
// existing structure, not forced onto LcsNavGroup or any other primitive
// not designed for this shape.
function SettingsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useSearch({ strict: false }) as { tab?: string };
  const [inlineTab, setInlineTab] = useState<"help" | "about" | null>(
    search?.tab === "help" ? "help" : search?.tab === "about" ? "about" : null
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5" style={{ color: "var(--lcs-accent)" }} />
        <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Settings</h1>
      </div>

      <div className="flex gap-6 lg:gap-8">
        {/* Left sidebar — 200px fixed */}
        <nav className="w-[200px] shrink-0 flex flex-col gap-1">
          {routeTabs.map((t) => {
            const active = inlineTab === null && (t.exact ? path === t.to : path.startsWith(t.to));
            return (
              <Link
                key={t.to}
                to={t.to as any}
                onClick={() => setInlineTab(null)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                style={{
                  fontFamily: "var(--font-lcs-ui)",
                  background: active ? "var(--lcs-progress-wash)" : "transparent",
                  color: active ? "var(--lcs-ink)" : "var(--lcs-ink-muted)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <t.icon className="h-4 w-4" style={{ color: active ? "var(--lcs-accent)" : undefined }} />
                {t.label}
              </Link>
            );
          })}

          <div className="my-2" style={{ borderTop: "1px solid var(--lcs-line)" }} />

          {inlineTabs.map((t) => {
            const active = inlineTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setInlineTab(t.id as "help" | "about")}
                data-testid={`settings-tab-${t.id}`}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left"
                style={{
                  fontFamily: "var(--font-lcs-ui)",
                  background: active ? "var(--lcs-progress-wash)" : "transparent",
                  color: active ? "var(--lcs-ink)" : "var(--lcs-ink-muted)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <t.icon className="h-4 w-4" style={{ color: active ? "var(--lcs-accent)" : undefined }} />
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
    <section className="border p-5 flex flex-col gap-4" style={{ borderColor: "var(--lcs-line)" }}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{title}</h2>
      {children}
    </section>
  );
}

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
  // Group 4 correction (3 Sep 2026): publicly_discoverable dropped from
  // this select — the "Publicly discoverable" toggle it fed has been
  // removed. Traced before removing: no query anywhere filters, orders,
  // or gates on this column (confirmed by grepping every .eq()/.select()
  // site across the repo and Supabase migrations), and the real public-
  // profile whitelist RPC (supabase/migrations/20260823000000) explicitly
  // excludes it by name — there is no directory/browse/search surface
  // for a toggle like this to control. CLAUDE.md §15 prohibits building
  // one. The column itself is left in place (data-retention question,
  // not this pass's to answer, same treatment as other retired-column
  // cases already logged in CLAUDE.md); only the dead UI writer and its
  // false "appears in directory and search" copy are removed.
  const { data: startup } = useQuery({
    queryKey: ["settings-startup", user?.id],
    enabled: !!user?.id && !isInvestor,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name, website, description, stage, country, profile_slug, founder_email")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

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
      const { error: avErr } = await supabase.from("users").update({ avatar_url: url }).eq("id", user.id);
      if (avErr) throw avErr;
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
      // R11 step 4: these were mistakenly concatenated into one query key
      // ["settings-startup", "settings-investor-profile"] — neither matches
      // the real keys (["settings-startup", user.id] /
      // ["settings-investor-profile", user.id]), so the investor-profile
      // cache was never actually invalidated after saving fund details.
      qc.invalidateQueries({ queryKey: ["settings-startup", user.id] });
      qc.invalidateQueries({ queryKey: ["settings-investor-profile", user.id] });
      toast.success("Saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSavingCompany(false);
    }
  };

  const initials = fullName ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex flex-col gap-5">
      {/* Section 1 — Profile */}
      <Card title="Profile">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center font-semibold text-lg shrink-0"
              style={{ background: "var(--lcs-accent)", color: "var(--lcs-white)" }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full grid place-items-center transition-colors"
              style={{ background: "var(--lcs-white)", border: "1px solid var(--lcs-line)" }}
            >
              {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" style={{ color: "var(--lcs-ink-muted)" }} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{fullName || user?.email}</div>
            <div className="text-xs mt-0.5">
              <span
                className="inline-block px-2 py-0.5 font-medium capitalize"
                style={{ background: "var(--lcs-progress-wash)", color: "var(--lcs-accent)", fontFamily: "var(--font-lcs-ui)" }}
              >
                {user?.role ?? "founder"}
              </span>
            </div>
          </div>
        </div>

        <LcsTextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />

        <LcsTextField
          label="Email address"
          value={user?.email ?? ""}
          disabled
          readOnly
          helper="Email cannot be changed. Contact support if needed."
        />

        <div className="flex justify-end pt-1">
          <LcsButton variant="primary" onClick={saveProfile} disabled={savingProfile}>
            {savingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save profile
          </LcsButton>
        </div>
      </Card>

      {/* Section 2 — Company / Fund */}
      <Card title={isInvestor ? "Fund details" : "Company info"}>
        <LcsTextField
          label={isInvestor ? "Fund name" : "Company name"}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder={isInvestor ? "Acme Ventures" : "Acme Inc."}
        />

        <LcsTextField label="Website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />

        {!isInvestor && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>One-liner description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What your company does in one sentence"
                className="w-full outline-none resize-none px-2.5 py-2 text-sm"
                style={{ fontFamily: "var(--font-lcs-ui)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)" }}
              />
            </div>

            <LcsSelectField label="Funding stage" value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">Select stage…</option>
              {["Pre-seed", "Seed", "Series A", "Series B", "Series C+", "Growth"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </LcsSelectField>
          </>
        )}

        <LcsTextField label="Location / country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="San Francisco, USA" />

        <div className="flex justify-end pt-1">
          <LcsButton variant="primary" onClick={saveCompany} disabled={savingCompany}>
            {savingCompany && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isInvestor ? "Save fund details" : "Save company info"}
          </LcsButton>
        </div>
      </Card>

    </div>
  );
}
