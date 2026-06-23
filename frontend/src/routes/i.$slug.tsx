import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Globe, Linkedin, CheckCircle2, Trophy, Briefcase, Users, Sparkles, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/i/$slug")({
  loader: async ({ params }) => {
    // Public path: only return published profiles.
    // Owner-preview detection happens client-side (server has no session context).
    const { data: profile } = await supabase
      .from("investor_profiles")
      .select("*")
      .eq("profile_slug", params.slug)
      .eq("profile_published", true)
      .maybeSingle();

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

    // Profile not found or private — return slug so component can check ownership client-side
    return { profile: null, teamMembers: [], portfolio: [], slug: params.slug };
  },
  component: InvestorPublicProfileWrapper,
});

// Wrapper handles the owner-preview path client-side where session is available
function InvestorPublicProfileWrapper() {
  const { profile: publicProfile, teamMembers: publicTeam, portfolio: publicPortfolio, slug } = Route.useLoaderData();

  const [ownerState, setOwnerState] = useState<
    | { loading: true }
    | { loading: false; isOwner: false }
    | { loading: false; isOwner: true; profile: any; teamMembers: any[]; portfolio: any[] }
  >({ loading: !publicProfile }); // only need to check if no public profile

  useEffect(() => {
    if (publicProfile) return; // already found public profile, no need to check

    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id || cancelled) {
          if (!cancelled) setOwnerState({ loading: false, isOwner: false });
          return;
        }

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

  // Has a public profile — show it (no banner)
  if (publicProfile) {
    return <InvestorPublicProfile profile={publicProfile} teamMembers={publicTeam} portfolio={publicPortfolio} isOwnerPreview={false} />;
  }

  // Still checking session
  if (ownerState.loading) {
    return (
      <div style={{ background: "#0A0A0B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid rgba(124,58,237,0.3)", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Logged in and it's their own unpublished profile — show with preview banner
  if (ownerState.isOwner) {
    return <InvestorPublicProfile profile={ownerState.profile} teamMembers={ownerState.teamMembers} portfolio={ownerState.portfolio} isOwnerPreview={true} />;
  }

  // Not found / private for non-owners
  return (
    <div style={{ background: "#0A0A0B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#FAFAFA" }}>
        <h1 style={{ fontSize: 32, fontFamily: "Syne, sans-serif", fontWeight: 800, marginBottom: 12 }}>Profile not found</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>This investor profile is private or doesn't exist.</p>
        <a href="/" style={{ display: "inline-block", marginTop: 24, color: "#7C3AED", textDecoration: "underline", fontSize: 14 }}>Back to Hockystick</a>
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

  return (
    <div style={{ background: "#0A0A0B", minHeight: "100vh", color: "#FAFAFA", fontFamily: "DM Sans, system-ui, sans-serif" }}>

      {/* Owner preview banner */}
      {isOwnerPreview && (
        <div style={{
          background: "rgba(245,158,11,0.12)",
          borderBottom: "1px solid rgba(245,158,11,0.25)",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EyeOff style={{ height: 14, width: 14, color: "#F59E0B", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#F59E0B", fontWeight: 500 }}>
              Preview mode — this is how your profile will look to others. Not published yet.
            </span>
          </div>
          <a href="/app/investor/profile" style={{ fontSize: 12, color: "#F59E0B", textDecoration: "underline", whiteSpace: "nowrap" }}>
            Back to profile settings
          </a>
        </div>
      )}

      {/* Nav bar */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="https://hockystick.app" style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, color: "#FAFAFA", textDecoration: "none", letterSpacing: "-0.01em" }}>Hockystick</a>
        <a href="https://hockystick.app" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Join the platform</a>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Hero */}
        <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "32px 36px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{ height: 80, width: 80, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 30, fontWeight: 800, fontFamily: "Syne, sans-serif", flexShrink: 0 }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.your_name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span>{(profile.your_name || profile.fund_name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 26, margin: 0, lineHeight: 1.15 }}>{profile.your_name || profile.fund_name}</h1>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginTop: 4 }}>
                {profile.role || "Partner"}{profile.fund_name ? ` · ${profile.fund_name}` : ""}
                {profile.fund_size ? ` · ${profile.fund_size} fund` : ""}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {profile.verification_tier && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 999, padding: "4px 10px", fontWeight: 600 }}>
                    <CheckCircle2 style={{ height: 12, width: 12 }} /> Hockystick Verified
                  </span>
                )}
                {profile.geography && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", borderRadius: 999, padding: "4px 10px" }}>
                    {profile.geography}
                  </span>
                )}
                {profile.stages && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, background: "rgba(124,58,237,0.1)", color: "#A855F7", borderRadius: 999, padding: "4px 10px" }}>
                    {profile.stages}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {linkedinUrl && (
                <a href={linkedinUrl.startsWith("http") ? linkedinUrl : `https://${linkedinUrl}`} target="_blank" rel="noopener noreferrer"
                  style={{ height: 36, width: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
                  <Linkedin style={{ height: 16, width: 16 }} />
                </a>
              )}
              {websiteUrl && (
                <a href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`} target="_blank" rel="noopener noreferrer"
                  style={{ height: 36, width: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
                  <Globe style={{ height: 16, width: 16 }} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Thesis */}
        {(profile.thesis_statement || tBullets.length > 0) && (
          <Section icon={<Sparkles style={{ height: 16, width: 16 }} />} title="Investment thesis">
            {profile.thesis_statement && (
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", margin: "0 0 16px" }}>{profile.thesis_statement}</p>
            )}
            {tBullets.length > 0 && (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {tBullets.map((b, i) => b.trim() && (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ marginTop: 7, height: 6, width: 6, borderRadius: "50%", background: "#7C3AED", flexShrink: 0, display: "block" }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {profile.secret_sauce && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: "#A855F7", fontWeight: 600, marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Edge</div>
                <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>{profile.secret_sauce}</p>
              </div>
            )}
          </Section>
        )}

        {/* Achievements / Track record */}
        {achievements.length > 0 && (
          <Section icon={<Trophy style={{ height: 16, width: 16 }} />} title="Track record">
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {achievements.map((a, i) => a.trim() && (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ marginTop: 7, height: 6, width: 6, borderRadius: "50%", background: "#10B981", flexShrink: 0, display: "block" }} />
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{a}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Team */}
        {teamMembers.length > 0 && (
          <Section icon={<Users style={{ height: 16, width: 16 }} />} title="Team">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {teamMembers.map((m: any) => (
                <div key={m.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ height: 40, width: 40, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span>{m.name.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{m.designation || m.role}</div>
                    </div>
                  </div>
                  {m.bio && <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{m.bio}</p>}
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

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <Section icon={<Briefcase style={{ height: 16, width: 16 }} />} title="Portfolio">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {portfolio.map((p: any) => (
                <div key={p.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ height: 36, width: 36, borderRadius: 8, overflow: "hidden", background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                      {p.logo_url
                        ? <img src={p.logo_url} alt={p.company_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span>{p.company_name.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.company_name}</div>
                  </div>
                  {p.description && <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>}
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

        {/* CTA — only for non-owners */}
        {!isOwnerPreview && (
          <div style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(168,85,247,0.06) 100%)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 16, padding: "28px 32px", textAlign: "center", marginTop: 32 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Connect with {profile.fund_name || profile.your_name}</div>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, margin: "0 0 20px" }}>Request a connection on Hockystick — the agentic VC deal flow platform.</p>
            <a href="https://hockystick.app"
              style={{ display: "inline-block", background: "#7C3AED", color: "#fff", textDecoration: "none", borderRadius: 10, padding: "10px 26px", fontSize: 14, fontWeight: 600, fontFamily: "DM Sans, sans-serif" }}>
              Request connection
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "18px 24px", textAlign: "center" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          Powered by <a href="https://hockystick.app" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Hockystick</a>
        </span>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "24px 28px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, color: "#7C3AED" }}>
        {icon}
        <h2 style={{ margin: 0, fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "#FAFAFA", letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}
