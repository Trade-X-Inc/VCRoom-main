import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LcsPageShell, LcsNavItem, LcsPageHeader, LcsCard, LcsButton, LcsTextField, LcsSelectField, LcsTextareaField, LcsEmptyState } from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import { ProfileStepNav, useFounderRole, NonFounderNotice } from "@/routes/deals-preview.profile";
import {
  getProfileTeamMembers,
  saveProfileTeamMember,
  removeProfileTeamMember,
  PROFILE_MEMBER_TAGS,
  PROFILE_MEMBER_SOCIAL_PLATFORMS,
  getSandboxCompany,
  type LcsProfileTeamMember,
  type LcsProfileMemberTag,
} from "@/lib/lcs-sandbox";

// Team Cards — real screen extraction (2 Sep 2026). Source:
// app.profile.tsx's TeamMembersSection. Real fields: full_name, role, tag
// (MEMBER_TAGS), key_person, bio, highlights[], social_links[]
// (MEMBER_SOCIAL_PLATFORMS). "Save your profile first to add team
// members" gate is real (app.profile.tsx:1772) — this sandbox's
// equivalent gates on getSandboxCompany() existing. No discovery-layer
// residue in the source file.
//
// Photo upload is NOT carried into this sandbox (no file storage here,
// same standing exclusion as the Contact-section avatar upload in Full
// Profile) — flagged, not silently dropped.

const BLANK_MEMBER = { fullName: "", role: "", tag: "Employee" as LcsProfileMemberTag, keyPerson: false, bio: "", highlights: [] as string[], socialLinks: [] as { platform: string; url: string }[] };

export const Route = createFileRoute("/deals-preview/profile_/team")({
  component: TeamCards,
});

function TeamCards() {
  const role = useFounderRole();
  const [hasCompany, setHasCompany] = useState<boolean | undefined>(undefined);
  const [members, setMembers] = useState<LcsProfileTeamMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState(BLANK_MEMBER);

  useEffect(() => {
    setHasCompany(!!getSandboxCompany());
    setMembers(getProfileTeamMembers());
  }, []);

  const startAdd = () => {
    setDraft(BLANK_MEMBER);
    setEditId(null);
    setShowForm(true);
  };

  const startEdit = (m: LcsProfileTeamMember) => {
    setDraft({ fullName: m.fullName, role: m.role, tag: m.tag, keyPerson: m.keyPerson, bio: m.bio, highlights: m.highlights, socialLinks: m.socialLinks });
    setEditId(m.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!draft.fullName.trim()) return;
    const next = saveProfileTeamMember(draft, editId ?? undefined);
    setMembers(next);
    setShowForm(false);
    setEditId(null);
  };

  const handleRemove = (id: string) => {
    setMembers(removeProfileTeamMember(id));
  };

  const isFounder = role === "founder";

  return (
    <LcsPageShell
      searchPlaceholder="Search transactions, LPs, requests"
      userInitials="RM"
      userLabel="R. Mehta"
      headerExtra={<RoleSwitcher />}
      sidebar={(collapsed) => (
        <nav className="flex flex-col gap-0.5 p-2">
          {!collapsed && (
            <div className="px-2 py-2 text-[15px] font-semibold" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>
              Lengdon
            </div>
          )}
          <LcsNavItem to="/deals-preview" label="Home" collapsed={collapsed} icon="H" />
          <LcsNavItem to="/deals-preview" label="Transactions" collapsed={collapsed} icon="T" />
          <LcsNavItem to="/deals-preview/requests" label="Requests" collapsed={collapsed} icon="R" />
          {role === "founder" && (
            <LcsNavItem to="/deals-preview/profile" label="Profile" active collapsed={collapsed} icon="C" />
          )}
          <LcsNavItem to="/deals-preview" label="Investors" collapsed={collapsed} icon="I" />
          <LcsNavItem to="/deals-preview/vault" label="Documents" collapsed={collapsed} icon="D" />
          <LcsNavItem to="/deals-preview" label="Reporting" collapsed={collapsed} icon="R" />
          {role === "advisor" && (
            <LcsNavItem to="/deals-preview/team" label="Team" collapsed={collapsed} icon="P" />
          )}
          <LcsNavItem to="/deals-preview" label="Settings" collapsed={collapsed} icon="S" />
        </nav>
      )}
    >
      <LcsPageHeader title="Company profile" description="Your public profile — how investors find and evaluate your company." />
      {role === undefined || hasCompany === undefined ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : !isFounder ? (
        <NonFounderNotice />
      ) : (
        <>
          <ProfileStepNav active="/deals-preview/profile/team" />
          {!hasCompany ? (
            <div className="border border-dashed p-6 text-center" style={{ borderColor: "var(--lcs-line)" }}>
              <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink-muted)" }}>Save your profile first to add team members.</p>
            </div>
          ) : (
            <LcsCard title="Team" count={members.length}>
              {members.length === 0 && !showForm ? (
                <LcsEmptyState text="No team members yet." action={<LcsButton variant="secondary" onClick={startAdd}>Add team member</LcsButton>} />
              ) : (
                <div className="p-4 flex flex-col gap-3">
                  {members.map((m) => (
                    <div key={m.id} className="border p-3 flex items-start justify-between gap-3" style={{ borderColor: "var(--lcs-line)" }}>
                      <div>
                        <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, fontWeight: 500, color: "var(--lcs-ink)" }}>
                          {m.fullName} <span style={{ fontWeight: 400, color: "var(--lcs-ink-muted)" }}>· {m.tag}</span>
                        </p>
                        {m.role && <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-ink-muted)" }}>{m.role}</p>}
                        {m.bio && <p className="mt-1" style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-ink)" }}>{m.bio}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <LcsButton variant="text-link" onClick={() => startEdit(m)}>Edit</LcsButton>
                        <LcsButton variant="text-link" onClick={() => handleRemove(m.id)}>Remove</LcsButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showForm ? (
                <div className="px-3 py-3 flex flex-col gap-2" style={{ borderTop: "1px solid var(--lcs-line)" }}>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <LcsTextField label="Full name" value={draft.fullName} onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))} />
                    <LcsTextField label="Role" value={draft.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} />
                    <LcsSelectField label="Tag" value={draft.tag} onChange={(e) => setDraft((d) => ({ ...d, tag: e.target.value as LcsProfileMemberTag }))}>
                      {PROFILE_MEMBER_TAGS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </LcsSelectField>
                  </div>
                  <LcsTextareaField label="Bio" value={draft.bio} onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} rows={3} />
                  <div className="flex items-center gap-2">
                    <LcsButton variant="primary" onClick={handleSave}>Save member</LcsButton>
                    <LcsButton variant="text-link" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</LcsButton>
                  </div>
                </div>
              ) : members.length > 0 ? (
                <div className="px-3 py-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
                  <LcsButton variant="secondary" onClick={startAdd}>Add team member</LcsButton>
                </div>
              ) : null}
            </LcsCard>
          )}
        </>
      )}
    </LcsPageShell>
  );
}
