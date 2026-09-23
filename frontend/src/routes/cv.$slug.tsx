import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Printer, MapPin, Phone } from "lucide-react";

export const Route = createFileRoute("/cv/$slug")({
  component: PublicCVPage,
});

interface MemberProfile {
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  phone: string | null;
  address: string | null;
  bio: string | null;
  avatar_url: string | null;
  experience: any[];
  education: any[];
  achievements: any[];
  skills: string[];
}

function PublicCVPage() {
  const { slug } = Route.useParams();

  const { data: profile, isLoading } = useQuery<MemberProfile | null>({
    queryKey: ["public-cv", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_member_profiles")
        .select("first_name, last_name, title, phone, address, bio, avatar_url, experience, education, achievements, skills")
        .eq("profile_slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      return data as MemberProfile | null;
    },
  });

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 14, fontFamily: "'Inter:Regular', sans-serif" }}>
        Loading…
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#425466" }}>
        <div style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: 20, color: "#0a2540", marginBottom: 8 }}>Profile not available</div>
        <div style={{ fontFamily: "'Inter:Regular', sans-serif", fontSize: 14, color: "#64748b" }}>This profile is private or does not exist.</div>
      </div>
    );
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unnamed";
  const initials = ((profile.first_name?.[0] ?? "") + (profile.last_name?.[0] ?? "")).toUpperCase() || "?";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .cv-page { padding: 0 !important; }
          .cv-card { border: 1px solid #e6e9ef !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* Print button */}
      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 10 }}>
        <button
          onClick={() => window.print()}
          style={{
            fontFamily: "'Geist:SemiBold', sans-serif",
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#0a2540", color: "#fff", border: "none",
            padding: "9px 16px", fontSize: 13, cursor: "pointer",
          }}
        >
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      <div className="cv-page" style={{ minHeight: "100vh", background: "#f8f9fb", padding: "40px 20px" }}>
        <div className="cv-card" style={{ maxWidth: 720, margin: "0 auto", background: "#fff", border: "1px solid #e6e9ef", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ background: "#0a2540", padding: "32px 36px", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{
              width: 72, height: 72, flexShrink: 0,
              background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center",
              justifyContent: "center", fontFamily: "'Geist:SemiBold', sans-serif", fontSize: 26, color: "#fff",
              overflow: "hidden",
            }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <div>
              <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: 26, color: "#fff", margin: 0, letterSpacing: "-0.03em" }}>{fullName}</h1>
              {profile.title && (
                <div style={{ fontFamily: "'Inter:Regular', sans-serif", fontSize: 14, color: "#c9d0db", marginTop: 4 }}>{profile.title}</div>
              )}
              <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                {profile.address && (
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#94a3b8" }}>
                    <MapPin size={11} /> {profile.address}
                  </span>
                )}
                {profile.phone && (
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#94a3b8" }}>
                    <Phone size={11} /> {profile.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: "28px 36px" }}>

            {/* Bio */}
            {profile.bio && (
              <CVSection title="About">
                <p style={{ fontFamily: "'Inter:Regular', sans-serif", fontSize: 14, color: "#425466", lineHeight: 1.7, margin: 0 }}>{profile.bio}</p>
              </CVSection>
            )}

            {/* Experience */}
            {profile.experience?.length > 0 && (
              <CVSection title="Experience">
                {profile.experience.map((exp: any, i: number) => (
                  <div key={i} style={{ marginBottom: i < profile.experience.length - 1 ? 20 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                      <div>
                        <div style={{ fontFamily: "'Inter:Medium', sans-serif", fontSize: 15, color: "#0a2540" }}>{exp.role}</div>
                        <div style={{ fontFamily: "'Inter:Regular', sans-serif", fontSize: 13, color: "#425466" }}>{exp.company}</div>
                      </div>
                      <div style={{ fontFamily: "'Inter:Regular', sans-serif", fontSize: 12, color: "#64748b", whiteSpace: "nowrap", marginLeft: 16 }}>
                        {exp.start_date}{exp.start_date && (exp.end_date || exp.is_current) ? " – " : ""}
                        {exp.is_current ? "Present" : exp.end_date}
                      </div>
                    </div>
                    {exp.description && (
                      <p style={{ fontFamily: "'Inter:Regular', sans-serif", fontSize: 13, color: "#425466", lineHeight: 1.6, margin: "6px 0 0" }}>{exp.description}</p>
                    )}
                  </div>
                ))}
              </CVSection>
            )}

            {/* Education */}
            {profile.education?.length > 0 && (
              <CVSection title="Education">
                {profile.education.map((edu: any, i: number) => (
                  <div key={i} style={{ marginBottom: i < profile.education.length - 1 ? 16 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontFamily: "'Inter:Medium', sans-serif", fontSize: 14, color: "#0a2540" }}>{edu.institution}</div>
                        <div style={{ fontFamily: "'Inter:Regular', sans-serif", fontSize: 13, color: "#425466" }}>
                          {[edu.degree, edu.field].filter(Boolean).join(" · ")}
                          {edu.grade ? ` · ${edu.grade}` : ""}
                        </div>
                      </div>
                      <div style={{ fontFamily: "'Inter:Regular', sans-serif", fontSize: 12, color: "#64748b", whiteSpace: "nowrap", marginLeft: 16 }}>
                        {edu.start_year}{edu.start_year && (edu.end_year || edu.is_ongoing) ? " – " : ""}
                        {edu.is_ongoing ? "Present" : edu.end_year}
                      </div>
                    </div>
                  </div>
                ))}
              </CVSection>
            )}

            {/* Achievements */}
            {profile.achievements?.length > 0 && (
              <CVSection title="Achievements">
                {profile.achievements.map((ach: any, i: number) => (
                  <div key={i} style={{ marginBottom: i < profile.achievements.length - 1 ? 14 : 0, display: "flex", gap: 10 }}>
                    <div style={{ width: 6, height: 6, background: "#0a2540", marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontFamily: "'Inter:Medium', sans-serif", fontSize: 14, color: "#0a2540" }}>{ach.title}</span>
                      {ach.year && <span style={{ fontFamily: "'Inter:Regular', sans-serif", fontSize: 12, color: "#64748b", marginLeft: 8 }}>{ach.year}</span>}
                      {ach.description && <p style={{ fontFamily: "'Inter:Regular', sans-serif", fontSize: 13, color: "#425466", margin: "3px 0 0", lineHeight: 1.5 }}>{ach.description}</p>}
                    </div>
                  </div>
                ))}
              </CVSection>
            )}

            {/* Skills */}
            {profile.skills?.length > 0 && (
              <CVSection title="Skills" last>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {profile.skills.map((s: string) => (
                    <span key={s} style={{
                      fontFamily: "'Inter:Medium', sans-serif",
                      background: "#f8f9fb", color: "#0a2540", border: "1px solid #e6e9ef",
                      padding: "4px 12px", fontSize: 12,
                    }}>
                      {s}
                    </span>
                  ))}
                </div>
              </CVSection>
            )}

          </div>

          {/* Footer */}
          <div style={{ padding: "16px 36px", background: "#f8f9fb", borderTop: "1px solid #e6e9ef", textAlign: "center" }}>
            <span style={{ fontFamily: "'Inter:Regular', sans-serif", fontSize: 11, color: "#64748b" }}>Built on </span>
            <a href="https://lengdon.com" style={{ fontFamily: "'Inter:Medium', sans-serif", fontSize: 11, color: "#0a2540", textDecoration: "none" }}>Lengdon</a>
          </div>
        </div>
      </div>
    </>
  );
}

function CVSection({ title, children, last = false }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : 28, paddingBottom: last ? 0 : 28, borderBottom: last ? "none" : "1px solid #e6e9ef" }}>
      <h2 style={{ fontFamily: "'Inter:Medium', sans-serif", fontSize: 11, color: "#0a2540", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, margin: "0 0 14px" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
