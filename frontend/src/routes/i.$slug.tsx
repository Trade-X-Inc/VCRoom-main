import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Globe, Linkedin, CheckCircle2, Trophy, Briefcase, Users, Sparkles, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { color, font } from "@/lib/design-tokens";

export const Route = createFileRoute("/i/$slug")({
  loader: async ({ params }) => {
    // get_public_investor_profile() is SECURITY DEFINER and callable by anon —
    // it re-checks profile_published internally and returns ONLY the columns
    // listed in that row's own public_fields whitelist (enforced in SQL, not
    // just by this page's JSX — see supabase/migrations for the function).
    const { data: profile } = await supabase.rpc("get_public_investor_profile", { p_slug: params.slug });

    if (profile) {
      const [{ data: teamMembers }, { data: portfolio }] = await Promise.all([
        supabase
          .from("investor_team_members")
          .select("id, name, role, designation, bio, linkedin_url, avatar_url, is_admin")
          .eq("investor_profile_id", profile.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("investor_portfolio_entries")
          .select("id, company_name, description, website_url, logo_url, display_order")
          .eq("investor_profile_id", profile.id)
          .order("display_order", { ascending: true }),
      ]);
      return { profile, teamMembers: teamMembers ?? [], portfolio: portfolio ?? [], slug: params.slug };
    }

    return { profile: null, teamMembers: [], portfolio: [], slug: params.slug };
  },
  component: InvestorPublicProfileWrapper,
});

function InvestorPublicProfileWrapper() {
  const { profile: publicProfile, teamMembers: publicTeam, portfolio: publicPortfolio, slug } = Route.useLoaderData();

  const [ownerState, setOwnerState] = useState<
    | { loading: true }
    | { loading: false; isOwner: false }
    | { loading: false; isOwner: true; profile: any; teamMembers: any[]; portfolio: any[] }
  >({ loading: !publicProfile });

  useEffect(() => {
    if (publicProfile) return;

    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id || cancelled) {
          if (!cancelled) setOwnerState({ loading: false, isOwner: false });
          return;
        }

        // Owner-preview path: the owner's own session bypasses the public
        // whitelist entirely via the investor_profiles_own RLS policy —
        // this intentionally shows the FULL profile with a preview banner,
        // not the whitelisted subset, so they can review everything.
        const { data: ownedProfile } = await supabase
          .from("investor_profiles")
          .select("*")
          .eq("profile_slug", slug)
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (cancelled) return;

        if (!ownedProfile) {
          setOwnerState({ loading: false, isOwner: false });
          return;
        }

        const [{ data: teamMembers }, { data: portfolio }] = await Promise.all([
          supabase
            .from("investor_team_members")
            .select("id, name, role, designation, bio, linkedin_url, avatar_url, is_admin")
            .eq("investor_profile_id", ownedProfile.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("investor_portfolio_entries")
            .select("id, company_name, description, website_url, logo_url, display_order")
            .eq("investor_profile_id", ownedProfile.id)
            .order("display_order", { ascending: true }),
        ]);

        if (!cancelled) {
          setOwnerState({
            loading: false,
            isOwner: true,
            profile: ownedProfile,
            teamMembers: teamMembers ?? [],
            portfolio: portfolio ?? [],
          });
        }
      } catch {
        if (!cancelled) setOwnerState({ loading: false, isOwner: false });
      }
    })();

    return () => { cancelled = true; };
  }, [publicProfile, slug]);

  if (publicProfile) {
    return <InvestorPublicProfile profile={publicProfile} teamMembers={publicTeam} portfolio={publicPortfolio} isOwnerPreview={false} />;
  }

  if (ownerState.loading) {
    return (
      <div style={{ background: color.canvas, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, border: `2px solid ${color.border}`, borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (ownerState.isOwner) {
    return <InvestorPublicProfile profile={ownerState.profile} teamMembers={ownerState.teamMembers} portfolio={ownerState.portfolio} isOwnerPreview={true} />;
  }

  return (
    <div style={{ background: color.canvas, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontFamily: font.display, fontWeight: 700, color: color.ink, marginBottom: 12 }}>Profile not found</h1>
        <p style={{ color: color.inkSecondary, fontSize: 14 }}>This investor profile is private or doesn't exist.</p>
        <a href="/" style={{ display: "inline-block", marginTop: 24, color: "#7C3AED", textDecoration: "underline", fontSize: 13 }}>Back to Hockystick</a>
      </div>
    </div>
  );
}

interface ProfilePageProps {
  profile: any;
  teamMembers: any[];
  portfolio: any[];
  isOwnerPreview: boolean;
}

function InvestorPublicProfile({ profile, teamMembers, portfolio, isOwnerPreview }: ProfilePageProps) {
  const linkedinEntry = profile.social_links?.find((l: any) => l.platform === "LinkedIn");
  const websiteEntry = profile.social_links?.find((l: any) => l.platform === "Website");
  const linkedinUrl = linkedinEntry?.url || profile.linkedin_url;
  const websiteUrl = websiteEntry?.url || profile.website;

  const tBullets: string[] = Array.isArray(profile.thesis_bullets) ? profile.thesis_bullets : [];
  const achievements: string[] = Array.isArray(profile.achievements) ? profile.achievements : [];
  const trackRecord: { label: string; detail: string; verified: boolean }[] = Array.isArray(profile.track_record) ? profile.track_record : [];

  return (
    <div style={{ background: color.canvas, minHeight: "100vh", color: color.ink, fontFamily: font.body }}>

      {isOwnerPreview && (
        <div style={{
          background: "rgba(245,158,11,0.08)",
          borderBottom: "1px solid rgba(245,158,11,0.25)",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EyeOff style={{ height: 14, width: 14, color: "#B45309", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#B45309", fontWeight: 500 }}>
              Preview mode — this shows your full profile, not the public whitelist. Not published yet.
            </span>
          </div>
          <a href="/app/investor/profile" style={{ fontSize: 12, color: "#B45309", textDecoration: "underline", whiteSpace: "nowrap" }}>
            Back to profile settings
          </a>
        </div>
      )}

      <nav style={{ borderBottom: `1px solid ${color.border}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: color.white }}>
        <a href="https://hockystick.app" style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: color.ink, textDecoration: "none" }}>Hockystick</a>
        <a href="https://hockystick.app" style={{ fontSize: 13, color: color.inkTertiary, textDecoration: "none" }}>Join the platform</a>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>

        <div style={{ background: color.white, border: `1px solid ${color.border}`, padding: "32px 36px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{ height: 72, width: 72, borderRadius: "50%", overflow: "hidden", background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 26, fontWeight: 700, fontFamily: font.display, flexShrink: 0 }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.your_name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span>{(profile.your_name || profile.fund_name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: font.display, fontWeight: 700, fontSize: 24, margin: 0, lineHeight: 1.2, color: color.ink }}>{profile.your_name || profile.fund_name}</h1>
              <div style={{ color: color.inkSecondary, fontSize: 14, marginTop: 4 }}>
                {profile.role || "Partner"}{profile.fund_name ? ` · ${profile.fund_name}` : ""}
                {profile.fund_size ? ` · ${profile.fund_size} fund` : ""}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {profile.verification_tier && profile.verification_tier !== "none" && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, background: "rgba(16,185,129,0.08)", color: "#059669", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 2, padding: "3px 8px", fontWeight: 500 }}>
                    <CheckCircle2 style={{ height: 12, width: 12 }} /> Hockystick Verified
                  </span>
                )}
                {profile.geography && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, background: color.canvas, color: color.inkSecondary, border: `1px solid ${color.border}`, borderRadius: 2, padding: "3px 8px" }}>
                    {profile.geography}
                  </span>
                )}
                {profile.stages && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, background: "rgba(124,58,237,0.06)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 2, padding: "3px 8px" }}>
                    {profile.stages}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {linkedinUrl && (
                <a href={linkedinUrl.startsWith("http") ? linkedinUrl : `https://${linkedinUrl}`} target="_blank" rel="noopener noreferrer"
                  style={{ height: 32, width: 32, border: `1px solid ${color.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: color.inkTertiary, textDecoration: "none" }}>
                  <Linkedin style={{ height: 14, width: 14 }} />
                </a>
              )}
              {websiteUrl && (
                <a href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`} target="_blank" rel="noopener noreferrer"
                  style={{ height: 32, width: 32, border: `1px solid ${color.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: color.inkTertiary, textDecoration: "none" }}>
                  <Globe style={{ height: 14, width: 14 }} />
                </a>
              )}
            </div>
          </div>
        </div>

        {(profile.thesis_statement || tBullets.length > 0) && (
          <Section icon={<Sparkles style={{ height: 15, width: 15 }} />} title="Investment thesis">
            {profile.thesis_statement && (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: color.inkSecondary, margin: "0 0 16px" }}>{profile.thesis_statement}</p>
            )}
            {tBullets.length > 0 && (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {tBullets.map((b, i) => b.trim() && (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ marginTop: 7, height: 4, width: 4, borderRadius: "50%", background: "#7C3AED", flexShrink: 0, display: "block" }} />
                    <span style={{ fontSize: 13, color: color.inkSecondary, lineHeight: 1.5 }}>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {profile.secret_sauce && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.15)" }}>
                <div style={{ fontSize: 11, color: "#7C3AED", fontWeight: 600, marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Edge</div>
                <p style={{ margin: 0, fontSize: 13, color: color.inkSecondary, lineHeight: 1.55 }}>{profile.secret_sauce}</p>
              </div>
            )}
          </Section>
        )}

        {(achievements.length > 0 || trackRecord.length > 0) && (
          <Section icon={<Trophy style={{ height: 15, width: 15 }} />} title="Track record">
            {achievements.length > 0 && (
              <ul style={{ margin: "0 0 12px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {achievements.map((a, i) => a.trim() && (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ marginTop: 7, height: 4, width: 4, borderRadius: "50%", background: "#10B981", flexShrink: 0, display: "block" }} />
                    <span style={{ fontSize: 13, color: color.inkSecondary, lineHeight: 1.5 }}>{a}</span>
                  </li>
                ))}
              </ul>
            )}
            {trackRecord.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {trackRecord.map((t, i) => (
                  <div key={i} style={{ border: `1px solid ${color.border}`, padding: "10px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: color.ink }}>{t.label}</div>
                      {t.detail && <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 2 }}>{t.detail}</div>}
                    </div>
                    {t.verified ? (
                      <span style={{ fontSize: 11, color: "#059669", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle2 style={{ width: 12, height: 12 }} /> Verified
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: color.inkTertiary, flexShrink: 0 }}>Unverified</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {teamMembers.length > 0 && (
          <Section icon={<Users style={{ height: 15, width: 15 }} />} title="Team">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {teamMembers.map((m: any) => (
                <div key={m.id} style={{ background: color.canvas, border: `1px solid ${color.border}`, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ height: 36, width: 36, borderRadius: "50%", overflow: "hidden", background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span>{m.name.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: color.inkTertiary, marginTop: 1 }}>{m.designation || m.role}</div>
                    </div>
                  </div>
                  {m.bio && <p style={{ margin: 0, fontSize: 12, color: color.inkTertiary, lineHeight: 1.5 }}>{m.bio}</p>}
                  {m.linkedin_url && (
                    <a href={m.linkedin_url.startsWith("http") ? m.linkedin_url : `https://${m.linkedin_url}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#7C3AED", textDecoration: "none" }}>
                      <Linkedin style={{ height: 11, width: 11 }} /> LinkedIn
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {portfolio.length > 0 && (
          <Section icon={<Briefcase style={{ height: 15, width: 15 }} />} title="Portfolio">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {portfolio.map((p: any) => (
                <div key={p.id} style={{ background: color.canvas, border: `1px solid ${color.border}`, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ height: 32, width: 32, overflow: "hidden", background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {p.logo_url
                        ? <img src={p.logo_url} alt={p.company_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span>{p.company_name.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.company_name}</div>
                  </div>
                  {p.description && <p style={{ margin: 0, fontSize: 12, color: color.inkTertiary, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}
                  {p.website_url && (
                    <a href={p.website_url.startsWith("http") ? p.website_url : `https://${p.website_url}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#7C3AED", textDecoration: "none", marginTop: 8 }}>
                      <Globe style={{ height: 10, width: 10 }} /> Website
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {!isOwnerPreview && (
          <div style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.2)", padding: "28px 32px", textAlign: "center", marginTop: 32 }}>
            <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, marginBottom: 8, color: color.ink }}>Connect with {profile.fund_name || profile.your_name}</div>
            <p style={{ color: color.inkSecondary, fontSize: 13, margin: "0 0 20px" }}>Request a connection on Hockystick — the agentic VC deal flow platform.</p>
            <a href="https://hockystick.app"
              style={{ display: "inline-block", background: "#7C3AED", color: "#fff", textDecoration: "none", borderRadius: 2, padding: "10px 24px", fontSize: 13, fontWeight: 500, fontFamily: font.body }}>
              Request connection
            </a>
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${color.border}`, padding: "18px 24px", textAlign: "center", background: color.white }}>
        <span style={{ fontSize: 12, color: color.inkTertiary }}>
          Powered by <a href="https://hockystick.app" style={{ color: color.inkTertiary, textDecoration: "none" }}>Hockystick</a>
        </span>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: color.white, border: `1px solid ${color.border}`, padding: "24px 28px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: "#7C3AED" }}>
        {icon}
        <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 700, fontSize: 14, color: color.ink }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}
