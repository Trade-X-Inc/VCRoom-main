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
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#666" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 8 }}>Profile not available</div>
        <div style={{ fontSize: 14, color: "#999" }}>This profile is private or does not exist.</div>
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
          .cv-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* Print button */}
      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 10 }}>
        <button
          onClick={() => window.print()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--gradient-brand)", color: "#fff", border: "none",
            borderRadius: 8, padding: "9px 16px", fontSize: 13,
            fontWeight: 500, cursor: "pointer", boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
          }}
        >
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      <div className="cv-page" style={{ minHeight: "100vh", background: "#f8f8fa", padding: "40px 20px" }}>
        <div className="cv-card" style={{ maxWidth: 720, margin: "0 auto", background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ background: "#0a0a0b", padding: "32px 36px", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
              background: "var(--gradient-brand)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 26, fontWeight: 700, color: "var(--foreground)",
              overflow: "hidden",
            }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--foreground)", margin: 0, letterSpacing: "-0.03em" }}>{fullName}</h1>
              {profile.title && (
                <div style={{ fontSize: 14, color: "#a1a1aa", marginTop: 4 }}>{profile.title}</div>
              )}
              <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                {profile.address && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#71717a" }}>
                    <MapPin size={11} /> {profile.address}
                  </span>
                )}
                {profile.phone && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#71717a" }}>
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
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: 0 }}>{profile.bio}</p>
              </CVSection>
            )}

            {/* Experience */}
            {profile.experience?.length > 0 && (
              <CVSection title="Experience">
                {profile.experience.map((exp: any, i: number) => (
                  <div key={i} style={{ marginBottom: i < profile.experience.length - 1 ? 20 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>{exp.role}</div>
                        <div style={{ fontSize: 13, color: "#6b7280" }}>{exp.company}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap", marginLeft: 16 }}>
                        {exp.start_date}{exp.start_date && (exp.end_date || exp.is_current) ? " – " : ""}
                        {exp.is_current ? "Present" : exp.end_date}
                      </div>
                    </div>
                    {exp.description && (
                      <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.6, margin: "6px 0 0" }}>{exp.description}</p>
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
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{edu.institution}</div>
                        <div style={{ fontSize: 13, color: "#6b7280" }}>
                          {[edu.degree, edu.field].filter(Boolean).join(" · ")}
                          {edu.grade ? ` · ${edu.grade}` : ""}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap", marginLeft: 16 }}>
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
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gradient-brand)", marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{ach.title}</span>
                      {ach.year && <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8 }}>{ach.year}</span>}
                      {ach.description && <p style={{ fontSize: 13, color: "#4b5563", margin: "3px 0 0", lineHeight: 1.5 }}>{ach.description}</p>}
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
                      background: "#f5f3ff", color: "#6d28d9",
                      padding: "4px 12px", borderRadius: 99,
                      fontSize: 12, fontWeight: 500,
                    }}>
                      {s}
                    </span>
                  ))}
                </div>
              </CVSection>
            )}

          </div>

          {/* Footer */}
          <div style={{ padding: "16px 36px", background: "#fafafa", borderTop: "1px solid #e5e7eb", textAlign: "center" }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Built on </span>
            <a href="https://hockystick.app" style={{ fontSize: 11, color: "var(--brand)", textDecoration: "none", fontWeight: 600 }}>Hockystick</a>
          </div>
        </div>
      </div>
    </>
  );
}

function CVSection({ title, children, last = false }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : 28, paddingBottom: last ? 0 : 28, borderBottom: last ? "none" : "1px solid #f3f4f6" }}>
      <h2 style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, margin: "0 0 14px" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
