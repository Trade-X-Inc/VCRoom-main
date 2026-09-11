import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Loader2, ExternalLink, Save, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { LcsButton } from "@/components/lcs";

export const Route = createFileRoute("/app/member-profile")({
  component: MemberProfilePage,
});

// ── Types ──────────────────────────────────────────────────────────

interface MemberProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  phone: string | null;
  address: string | null;
  bio: string | null;
  avatar_url: string | null;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  achievements: AchievementEntry[];
  skills: string[];
  profile_slug: string | null;
  is_public: boolean;
}

interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
}

interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string;
  start_year: string;
  end_year: string;
  is_ongoing: boolean;
  grade: string;
}

interface AchievementEntry {
  id: string;
  title: string;
  description: string;
  year: string;
}

const DEGREES = ["Bachelor's", "Master's", "PhD", "Diploma", "Certificate", "MBA", "Other"];

function genId() {
  return Math.random().toString(36).slice(2);
}

function initials(first: string, last: string) {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || "?";
}

function slugify(v: string) {
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── Component ──────────────────────────────────────────────────────

function MemberProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: profile } = useQuery<MemberProfile | null>({
    queryKey: ["member-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_member_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as MemberProfile | null;
    },
  });

  useEffect(() => {
    if (profile && !loaded) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      setTitle(profile.title ?? "");
      setPhone(profile.phone ?? "");
      setAddress(profile.address ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? null);
      setIsPublic(profile.is_public ?? false);
      setProfileSlug(profile.profile_slug ?? null);
      setSkills(profile.skills ?? []);
      setExperience(profile.experience ?? []);
      setEducation(profile.education ?? []);
      setAchievements(profile.achievements ?? []);
      setLoaded(true);
    } else if (profile === null && !loaded) {
      setLoaded(true);
    }
  }, [profile, loaded]);

  // Mark unsaved whenever a field changes
  const markDirty = () => setSaved(false);

  // Auto-save helper — debounced 600ms (still used for incremental field edits)
  const autoSave = (patch: Partial<MemberProfile>) => {
    if (!user?.id) return;
    markDirty();
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const slug = (patch.profile_slug ?? profileSlug ?? slugify(`${firstName} ${lastName}`.trim())) || undefined;
      if (profile?.id) {
        const { error } = await supabase
          .from("team_member_profiles")
          .update({ ...patch, profile_slug: slug, updated_at: new Date().toISOString() })
          .eq("user_id", user!.id);
        if (error) console.warn("[member-profile] auto-save error:", error.message);
        else { qc.invalidateQueries({ queryKey: ["member-profile", user.id] }); setSaved(true); }
      } else {
        const { error } = await supabase
          .from("team_member_profiles")
          .upsert({ user_id: user.id, ...patch, profile_slug: slug }, { onConflict: "user_id" });
        if (error) console.warn("[member-profile] upsert error:", error.message);
        else { qc.invalidateQueries({ queryKey: ["member-profile", user.id] }); setSaved(true); }
      }
    }, 600);
  };

  // Explicit save button handler — saves ALL current state at once
  const handleSave = async () => {
    if (!user?.id || saving) return;
    setSaving(true);
    try {
      const slug = slugify(`${firstName} ${lastName}`.trim()) || profileSlug || undefined;
      const patch = {
        first_name: firstName,
        last_name: lastName,
        title,
        phone,
        address,
        bio,
        avatar_url: avatarUrl,
        is_public: isPublic,
        profile_slug: slug ?? null,
        skills,
        experience,
        education,
        achievements,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("team_member_profiles")
        .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["member-profile", user.id] });
      setSaved(true);
      toast.success("Profile saved");
    } catch (e: any) {
      toast.error(e.message ?? "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  // Canvas crop to square WebP
  const cropToSquare = (file: File, size: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")), "image/webp", 0.9);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setAvatarUploading(true);
    try {
      const croppedBlob = await cropToSquare(file, 400);
      const path = `members/${user.id}/${Date.now()}.webp`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, croppedBlob, { contentType: "image/webp", upsert: true });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;

      // Save to team_member_profiles
      const { error: profErr } = await supabase
        .from("team_member_profiles")
        .upsert({ user_id: user.id, avatar_url: url }, { onConflict: "user_id" });
      if (profErr) throw profErr;

      // Also update startup_team_accounts.avatar_url for quick access in lists
      const { error: acctErr } = await supabase
        .from("startup_team_accounts")
        .update({ avatar_url: url })
        .eq("user_id", user.id);
      if (acctErr) console.error("[member-profile] avatar mirror failed:", acctErr);

      setAvatarUrl(url);
      qc.invalidateQueries({ queryKey: ["member-profile", user.id] });
      toast.success("Profile photo updated");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s || skills.includes(s) || skills.length >= 20) return;
    const next = [...skills, s];
    setSkills(next);
    setSkillInput("");
    autoSave({ skills: next } as any);
  };

  const removeSkill = (s: string) => {
    const next = skills.filter((x) => x !== s);
    setSkills(next);
    autoSave({ skills: next } as any);
  };

  const addExperience = () => {
    const e: ExperienceEntry = { id: genId(), company: "", role: "", start_date: "", end_date: "", is_current: false, description: "" };
    const next = [e, ...experience];
    setExperience(next);
  };

  const updateExp = (id: string, patch: Partial<ExperienceEntry>) => {
    const next = experience.map((e) => e.id === id ? { ...e, ...patch } : e);
    setExperience(next);
    autoSave({ experience: next } as any);
  };

  const removeExp = (id: string) => {
    const next = experience.filter((e) => e.id !== id);
    setExperience(next);
    autoSave({ experience: next } as any);
  };

  const addEducation = () => {
    const e: EducationEntry = { id: genId(), institution: "", degree: "Bachelor's", field: "", start_year: "", end_year: "", is_ongoing: false, grade: "" };
    const next = [e, ...education];
    setEducation(next);
  };

  const updateEdu = (id: string, patch: Partial<EducationEntry>) => {
    const next = education.map((e) => e.id === id ? { ...e, ...patch } : e);
    setEducation(next);
    autoSave({ education: next } as any);
  };

  const removeEdu = (id: string) => {
    const next = education.filter((e) => e.id !== id);
    setEducation(next);
    autoSave({ education: next } as any);
  };

  const addAchievement = () => {
    const a: AchievementEntry = { id: genId(), title: "", description: "", year: "" };
    const next = [a, ...achievements];
    setAchievements(next);
  };

  const updateAch = (id: string, patch: Partial<AchievementEntry>) => {
    const next = achievements.map((a) => a.id === id ? { ...a, ...patch } : a);
    setAchievements(next);
    autoSave({ achievements: next } as any);
  };

  const removeAch = (id: string) => {
    const next = achievements.filter((a) => a.id !== id);
    setAchievements(next);
    autoSave({ achievements: next } as any);
  };

  const shareUrl = profileSlug ? `https://lengdon.com/cv/${profileSlug}` : null;

  if (!loaded) {
    return (
      <div style={{ padding: 32, maxWidth: 700, margin: "0 auto" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 120, background: "var(--lcs-surface)", marginBottom: 16 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 32px 120px", maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--lcs-ink)", letterSpacing: "-0.03em", marginBottom: 4, fontFamily: "var(--font-lcs-ui)" }}>
        My Profile
      </h1>
      <p style={{ fontSize: 13, color: "var(--lcs-ink-muted)", marginBottom: 32, fontFamily: "var(--font-lcs-ui)" }}>
        Build your professional CV. Use the Save button below when done.
      </p>

      {/* Section 1 — Header */}
      <Card title="Profile info">
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
          {/* Avatar — click to upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 96, height: 96, borderRadius: "50%", flexShrink: 0,
              background: "var(--lcs-surface)", border: "2px solid var(--lcs-line)",
              cursor: "pointer", overflow: "hidden", position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {avatarUploading
              ? <Loader2 size={22} style={{ color: "var(--lcs-accent)", animation: "spin 1s linear infinite" }} />
              : avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 32, fontWeight: 800, color: "var(--lcs-accent)", fontFamily: "var(--font-lcs-ui)" }}>
                  {initials(firstName, lastName)}
                </span>
            }
            <div
              style={{
                position: "absolute", inset: 0,
                background: "color-mix(in srgb, var(--lcs-ink) 55%, transparent)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                opacity: 0, transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0"; }}
            >
              <User size={20} style={{ color: "var(--lcs-white)" }} />
              <span style={{ fontSize: 10, color: "var(--lcs-white)", fontWeight: 600, marginTop: 4, fontFamily: "var(--font-lcs-ui)" }}>Upload</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarUpload(file);
              e.target.value = "";
            }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--lcs-ink)", marginBottom: 2, fontFamily: "var(--font-lcs-ui)" }}>Profile photo</div>
            <div style={{ fontSize: 11, color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>Max 2MB · Cropped to 400×400 square</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <LabeledInput
            label="First name"
            value={firstName}
            onChange={(v) => { setFirstName(v); autoSave({ first_name: v } as any); }}
          />
          <LabeledInput
            label="Last name"
            value={lastName}
            onChange={(v) => { setLastName(v); autoSave({ last_name: v } as any); }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <LabeledInput
            label="Title / Role"
            placeholder="Senior Analyst"
            value={title}
            onChange={(v) => { setTitle(v); autoSave({ title: v } as any); }}
          />
          <LabeledInput
            label="Phone"
            placeholder="+1 555 000 0000"
            value={phone}
            onChange={(v) => { setPhone(v); autoSave({ phone: v } as any); }}
          />
        </div>
        <LabeledInput
          label="Address (city, country)"
          placeholder="Dubai, UAE"
          value={address}
          onChange={(v) => { setAddress(v); autoSave({ address: v } as any); }}
          style={{ marginBottom: 16 }}
        />

        {/* Share toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderTop: "1px solid var(--lcs-line)" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--lcs-ink)", marginBottom: 2, fontFamily: "var(--font-lcs-ui)" }}>Public CV</div>
            <div style={{ fontSize: 11, color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
              Make your profile publicly shareable at a unique URL.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={() => {
              const next = !isPublic;
              setIsPublic(next);
              autoSave({ is_public: next } as any);
            }}
            style={{
              width: 36, height: 20, borderRadius: 10, border: "none", flexShrink: 0,
              background: isPublic ? "var(--lcs-accent)" : "var(--lcs-line)",
              cursor: "pointer", position: "relative", transition: "background 0.2s",
            }}
          >
            <span style={{
              position: "absolute", top: 2, left: isPublic ? 18 : 2,
              width: 16, height: 16, borderRadius: "50%", background: "var(--lcs-white)",
              transition: "left 0.2s",
            }} />
          </button>
        </div>
        {isPublic && shareUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "10px 12px", background: "var(--lcs-surface)", border: "1px solid var(--lcs-line)" }}>
            <span style={{ fontSize: 12, color: "var(--lcs-ink-muted)", flex: 1, wordBreak: "break-all", fontFamily: "var(--font-lcs-ui)" }}>{shareUrl}</span>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--lcs-accent)", display: "flex" }}>
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </Card>

      {/* Section 2 — Bio */}
      <Card title="Bio" style={{ marginTop: 16 }}>
        <div style={{ position: "relative" }}>
          <textarea
            value={bio}
            onChange={(e) => { setBio(e.target.value.slice(0, 400)); autoSave({ bio: e.target.value.slice(0, 400) } as any); }}
            placeholder="Brief introduction — who you are, what you've done, what you're focused on."
            rows={4}
            style={{ ...textareaStyle, resize: "none" }}
          />
          <div style={{ fontSize: 11, color: "var(--lcs-ink-muted)", textAlign: "right", marginTop: 4 }}>
            {bio.length}/400
          </div>
        </div>
      </Card>

      {/* Section 3 — Experience */}
      <Card title="Experience" style={{ marginTop: 16 }}
        action={<AddBtn onClick={addExperience} label="Add position" />}>
        {experience.length === 0 ? (
          <EmptyHint text="No positions" />
        ) : (
          experience.map((exp) => (
            <ExpCard key={exp.id} exp={exp} onChange={(p) => updateExp(exp.id, p)} onRemove={() => removeExp(exp.id)} />
          ))
        )}
      </Card>

      {/* Section 4 — Education */}
      <Card title="Education" style={{ marginTop: 16 }}
        action={<AddBtn onClick={addEducation} label="Add" />}>
        {education.length === 0 ? (
          <EmptyHint text="No education entries" />
        ) : (
          education.map((edu) => (
            <EduCard key={edu.id} edu={edu} onChange={(p) => updateEdu(edu.id, p)} onRemove={() => removeEdu(edu.id)} />
          ))
        )}
      </Card>

      {/* Section 5 — Achievements */}
      <Card title="Achievements" style={{ marginTop: 16 }}
        action={<AddBtn onClick={addAchievement} label="Add" />}>
        {achievements.length === 0 ? (
          <EmptyHint text="No achievements" />
        ) : (
          achievements.map((ach) => (
            <AchCard key={ach.id} ach={ach} onChange={(p) => updateAch(ach.id, p)} onRemove={() => removeAch(ach.id)} />
          ))
        )}
      </Card>

      {/* Section 6 — Skills */}
      <Card title="Skills" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {skills.map((s) => (
            <span key={s} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "var(--lcs-surface)", border: "1px solid var(--lcs-line)",
              padding: "4px 12px", fontSize: 12, color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)",
            }}>
              {s}
              <button onClick={() => removeSkill(s)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, display: "flex" }}>
                <X size={11} />
              </button>
            </span>
          ))}
          {skills.length < 20 && (
            <span style={{ fontSize: 11, color: "var(--lcs-ink-muted)", display: "flex", alignItems: "center", fontFamily: "var(--font-lcs-ui)" }}>
              {skills.length}/20
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            placeholder="Type a skill and press Enter"
            style={{ ...inputStyle, flex: 1 }}
          />
          <LcsButton variant="primary" onClick={addSkill} className="text-xs px-3.5 py-2">
            Add
          </LcsButton>
        </div>
      </Card>

      {/* Sticky save bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
        background: "var(--lcs-white)", backdropFilter: "blur(8px)",
        borderTop: "1px solid var(--lcs-line)",
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16,
      }}>
        <span style={{ fontSize: 13, color: saved ? "var(--lcs-satisfied)" : "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
          {saved ? "Saved" : "Unsaved changes"}
        </span>
        <LcsButton variant="primary" onClick={handleSave} disabled={saving} className="text-sm px-6 py-2.5 inline-flex items-center gap-1.5">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save profile
        </LcsButton>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function Card({ title, children, style, action }: { title: string; children: React.ReactNode; style?: React.CSSProperties; action?: React.ReactNode }) {
  return (
    <div style={{ background: "var(--lcs-white)", border: "1px solid var(--lcs-line)", overflow: "hidden", ...style }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--lcs-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <LcsButton variant="secondary" onClick={onClick} className="text-[11px] px-2.5 py-1 inline-flex items-center gap-1">
      <Plus size={11} /> {label}
    </LcsButton>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: "var(--lcs-ink-muted)", padding: "8px 0", fontFamily: "var(--font-lcs-ui)" }}>{text}</div>;
}

function LabeledInput({
  label, value, onChange, placeholder, style,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <label style={labelStyle}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

function ExpCard({ exp, onChange, onRemove }: { exp: ExperienceEntry; onChange: (p: Partial<ExperienceEntry>) => void; onRemove: () => void }) {
  return (
    <div style={{ background: "var(--lcs-surface)", border: "1px solid var(--lcs-line)", padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lcs-ink-muted)" }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Company *</label>
          <input value={exp.company} onChange={(e) => onChange({ company: e.target.value })} placeholder="Acme Corp" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Role / Title *</label>
          <input value={exp.role} onChange={(e) => onChange({ role: e.target.value })} placeholder="Senior Analyst" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Start date</label>
          <input value={exp.start_date} onChange={(e) => onChange({ start_date: e.target.value })} placeholder="Jan 2021" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>End date</label>
          <input value={exp.end_date} onChange={(e) => onChange({ end_date: e.target.value })} placeholder="Dec 2023" disabled={exp.is_current} style={{ ...inputStyle, opacity: exp.is_current ? 0.4 : 1 }} />
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--lcs-ink-muted)", cursor: "pointer", marginBottom: 12 }}>
        <input type="checkbox" checked={exp.is_current} onChange={(e) => onChange({ is_current: e.target.checked, end_date: "" })} />
        Current role
      </label>
      <div>
        <label style={labelStyle}>Description (max 300 chars)</label>
        <textarea
          value={exp.description}
          onChange={(e) => onChange({ description: e.target.value.slice(0, 300) })}
          rows={2}
          style={{ ...textareaStyle, resize: "none" }}
        />
        <div style={{ fontSize: 10, color: "var(--lcs-ink-muted)", textAlign: "right" }}>{exp.description.length}/300</div>
      </div>
    </div>
  );
}

function EduCard({ edu, onChange, onRemove }: { edu: EducationEntry; onChange: (p: Partial<EducationEntry>) => void; onRemove: () => void }) {
  return (
    <div style={{ background: "var(--lcs-surface)", border: "1px solid var(--lcs-line)", padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lcs-ink-muted)" }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Institution *</label>
          <input value={edu.institution} onChange={(e) => onChange({ institution: e.target.value })} placeholder="MIT" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Degree</label>
          <select value={edu.degree} onChange={(e) => onChange({ degree: e.target.value })} style={inputStyle}>
            {DEGREES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Field of study</label>
          <input value={edu.field} onChange={(e) => onChange({ field: e.target.value })} placeholder="Computer Science" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Grade / GPA (optional)</label>
          <input value={edu.grade} onChange={(e) => onChange({ grade: e.target.value })} placeholder="3.8 / 4.0" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Start year</label>
          <input value={edu.start_year} onChange={(e) => onChange({ start_year: e.target.value })} placeholder="2018" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>End year</label>
          <input value={edu.end_year} onChange={(e) => onChange({ end_year: e.target.value })} placeholder="2022" disabled={edu.is_ongoing} style={{ ...inputStyle, opacity: edu.is_ongoing ? 0.4 : 1 }} />
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--lcs-ink-muted)", cursor: "pointer" }}>
        <input type="checkbox" checked={edu.is_ongoing} onChange={(e) => onChange({ is_ongoing: e.target.checked, end_year: "" })} />
        Ongoing
      </label>
    </div>
  );
}

function AchCard({ ach, onChange, onRemove }: { ach: AchievementEntry; onChange: (p: Partial<AchievementEntry>) => void; onRemove: () => void }) {
  return (
    <div style={{ background: "var(--lcs-surface)", border: "1px solid var(--lcs-line)", padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lcs-ink-muted)" }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Title *</label>
          <input value={ach.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Best Startup Award" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Year</label>
          <input value={ach.year} onChange={(e) => onChange({ year: e.target.value })} placeholder="2023" style={{ ...inputStyle, width: 80 }} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Description (max 200 chars)</label>
        <textarea
          value={ach.description}
          onChange={(e) => onChange({ description: e.target.value.slice(0, 200) })}
          rows={2}
          style={{ ...textareaStyle, resize: "none" }}
        />
        <div style={{ fontSize: 10, color: "var(--lcs-ink-muted)", textAlign: "right" }}>{ach.description.length}/200</div>
      </div>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: "var(--lcs-ink-muted)",
  textTransform: "uppercase", letterSpacing: "0.08em",
  display: "block", marginBottom: 5, fontFamily: "var(--font-lcs-ui)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--lcs-white)",
  border: "1px solid var(--lcs-line)", borderRadius: 0,
  padding: "0 10px", height: 32, fontSize: 14, color: "var(--lcs-ink)",
  outline: "none", boxSizing: "border-box", fontFamily: "var(--font-lcs-ui)",
};

const textareaStyle: React.CSSProperties = {
  width: "100%", background: "var(--lcs-white)",
  border: "1px solid var(--lcs-line)", borderRadius: 0,
  padding: "8px 10px", fontSize: 14, color: "var(--lcs-ink)",
  outline: "none", boxSizing: "border-box", fontFamily: "var(--font-lcs-ui)",
};
