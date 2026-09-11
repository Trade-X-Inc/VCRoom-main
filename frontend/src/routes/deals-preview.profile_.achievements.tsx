import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LcsPageShell, LcsNavItem, LcsPageHeader, LcsButton, LcsEmptyState } from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import { ProfileStepNav, useFounderRole, NonFounderNotice } from "@/routes/deals-preview.profile";
import {
  getAchievements,
  saveAchievements,
  getAchievementsVisibility,
  cycleAchievementsVisibility,
  ACHIEVEMENT_SCOPES,
  ACHIEVEMENT_VISIBILITY_LABEL,
  getSandboxCompany,
  type LcsAchievement,
  type LcsAchievementScope,
} from "@/lib/lcs-sandbox";

// Achievements — real screen extraction (2 Sep 2026). Source:
// app.prepare.profile-builder.achievements.tsx, ported near-verbatim —
// this was already the cleanest, most self-contained real file in the
// whole set (the agent's map: "zero discovery residue"). Real fields:
// title, description, scope (individual/team/company), date. Real
// visibility cycle private -> deal_room -> public, including the real
// emoji-suffixed labels ("Private 🔒" etc.) — kept as-is, since this is a
// verbatim reskin of real product copy, not a new primitive CLAUDE.md
// §13's emoji ban would apply to.
//
// "Build your profile first" gate is real (the source file's own
// EmptyState for !startup?.id) — this sandbox's equivalent gates on
// getSandboxCompany().

export const Route = createFileRoute("/deals-preview/profile_/achievements")({
  component: Achievements,
});

function Achievements() {
  const role = useFounderRole();
  const [hasCompany, setHasCompany] = useState<boolean | undefined>(undefined);
  const [items, setItems] = useState<LcsAchievement[]>([]);
  const [visibility, setVisibility] = useState<"private" | "deal_room" | "public">("private");

  useEffect(() => {
    setHasCompany(!!getSandboxCompany());
    setItems(getAchievements());
    setVisibility(getAchievementsVisibility());
  }, []);

  const persist = (next: LcsAchievement[]) => {
    setItems(next);
    saveAchievements(next);
  };

  const addItem = () => {
    persist([...items, { id: `ach-${Date.now()}`, title: "", description: "", scope: "individual", date: "" }]);
  };

  const updateItem = (id: string, patch: Partial<LcsAchievement>) => {
    persist(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    persist(items.filter((it) => it.id !== id));
  };

  const handleCycleVisibility = () => {
    setVisibility(cycleAchievementsVisibility());
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
      <LcsPageHeader
        title="Company profile"
        description="Individual, team, and company achievements — shown on your digital profile and in deal rooms."
        action={
          hasCompany ? (
            <div className="flex items-center gap-2">
              <LcsButton variant="secondary" onClick={handleCycleVisibility}>
                {ACHIEVEMENT_VISIBILITY_LABEL[visibility]}
              </LcsButton>
              <LcsButton variant="primary" onClick={addItem}>
                Add achievement
              </LcsButton>
            </div>
          ) : undefined
        }
      />
      {role === undefined || hasCompany === undefined ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : !isFounder ? (
        <NonFounderNotice />
      ) : (
        <>
          <ProfileStepNav active="/deals-preview/profile/achievements" />
          {!hasCompany ? (
            <div className="border border-dashed p-6 text-center" style={{ borderColor: "var(--lcs-line)" }}>
              <p style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 13, color: "var(--lcs-ink-muted)" }}>Build your profile first.</p>
            </div>
          ) : items.length === 0 ? (
            <LcsEmptyState text="No achievements yet." action={<LcsButton variant="secondary" onClick={addItem}>Add achievement</LcsButton>} />
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.id} className="border" style={{ borderColor: "var(--lcs-line)" }}>
                  <div className="p-3 flex flex-col gap-2">
                    <div className="grid sm:grid-cols-[1fr_140px_140px] gap-3">
                      <input
                        value={item.title}
                        onChange={(e) => updateItem(item.id, { title: e.target.value })}
                        placeholder="e.g. Named to Forbes 30 Under 30"
                        className="h-8 px-3 text-[13px] outline-none"
                        style={{ border: "1px solid var(--lcs-line)", fontFamily: "var(--font-lcs-ui)" }}
                      />
                      <select
                        value={item.scope}
                        onChange={(e) => updateItem(item.id, { scope: e.target.value as LcsAchievementScope })}
                        className="h-8 px-3 text-[13px] outline-none"
                        style={{ border: "1px solid var(--lcs-line)", fontFamily: "var(--font-lcs-ui)" }}
                      >
                        {ACHIEVEMENT_SCOPES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateItem(item.id, { date: e.target.value })}
                        className="h-8 px-3 text-[13px] outline-none"
                        style={{ border: "1px solid var(--lcs-line)", fontFamily: "var(--font-lcs-ui)" }}
                      />
                    </div>
                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      rows={2}
                      placeholder="Brief context — what happened and why it matters."
                      className="w-full px-3 py-2 text-[13px] outline-none resize-none"
                      style={{ border: "1px solid var(--lcs-line)", fontFamily: "var(--font-lcs-ui)" }}
                    />
                    <div>
                      <LcsButton variant="text-link" onClick={() => removeItem(item.id)}>
                        Remove
                      </LcsButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </LcsPageShell>
  );
}
