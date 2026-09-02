import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LcsPageShell,
  LcsNavItem,
  LcsPageHeader,
  LcsTable,
  LcsTableHead,
  LcsTh,
  LcsTableBody,
  LcsTr,
  LcsTd,
} from "@/components/lcs";
import { RoleSwitcher, VIEWER_ROLE_CHANGE_EVENT } from "@/components/deals-preview/RoleSwitcher";
import { TEAM_MEMBERS, TEAM_MEMBER_ROLE_LABEL, type LcsViewerRole } from "@/lib/lcs-sandbox";

// Sector-layer restructure, checkpoint 4 (2 Sep 2026) — advisor team
// management. Nav-visible only in Advisor role, per the plan approved
// before checkpoint 1 was built: "advisor -> additionally shows a new
// 'Team' nav entry ... a flat LcsTable of sandbox analysts/counsel/
// accountants (name, role, client-company count)." This is read-only —
// no reset, no add/remove — matching the "minimal table version, existing
// primitives only" scope from that plan; TEAM_MEMBERS in lcs-sandbox.ts
// is a plain const, not localStorage-backed, since there's nothing here
// to persist a mutation of.
//
// Client-company names are real cross-references against the seed
// transactions' own companyName values (lcs-sandbox.ts), never invented
// ones — same no-fabricated-count discipline as every other count in this
// build (sector schedule counts, instrument counts).
//
// Role gating: this route has no server-side guard (matches every other
// deals-preview route — no backend wiring, per this build's standing
// rule) and is reachable by direct URL regardless of role, same as every
// other screen here. What's actually gated is the "Team" nav entry itself
// (rendered only when role === "advisor") and the page content for a
// non-advisor visitor, which shows an explicit "advisor only" notice
// rather than silently rendering the roster to a founder/investor who
// found the URL — the honest equivalent of a route guard in a sandbox
// with no real auth to guard with.
//
// Responsive: built against the addendum from the start (sticky first
// table column, matching every other list screen's convention), not
// retrofitted — per direct instruction. No new breakpoint behavior
// needed beyond what LcsPageShell/LcsTable already provide.

const VIEWER_ROLE_KEY = "lcs-viewer-role";

export const Route = createFileRoute("/deals-preview/team")({
  component: TeamManagement,
});

function TeamManagement() {
  const [role, setRole] = useState<LcsViewerRole | undefined>(undefined);

  useEffect(() => {
    const readRole = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(VIEWER_ROLE_KEY);
      } catch {
        /* private window / storage blocked — default to founder */
      }
      setRole(stored === "founder" || stored === "investor" || stored === "advisor" ? stored : "founder");
    };
    readRole();
    window.addEventListener(VIEWER_ROLE_CHANGE_EVENT, readRole);
    return () => window.removeEventListener(VIEWER_ROLE_CHANGE_EVENT, readRole);
  }, []);

  const isAdvisor = role === "advisor";

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
          <LcsNavItem to="/deals-preview" label="Requests" collapsed={collapsed} icon="R" />
          {role === "founder" && (
            <LcsNavItem to="/deals-preview/profile" label="Profile" collapsed={collapsed} icon="C" />
          )}
          <LcsNavItem to="/deals-preview" label="Investors" collapsed={collapsed} icon="I" />
          <LcsNavItem to="/deals-preview/vault" label="Documents" collapsed={collapsed} icon="D" />
          <LcsNavItem to="/deals-preview" label="Reporting" collapsed={collapsed} icon="R" />
          {isAdvisor && (
            <LcsNavItem to="/deals-preview/team" label="Team" active collapsed={collapsed} icon="P" />
          )}
          <LcsNavItem to="/deals-preview" label="Settings" collapsed={collapsed} icon="S" />
        </nav>
      )}
    >
      <LcsPageHeader
        title="Team"
        description="Analysts, counsel and accountants on your advisory team, and the client companies each is assigned to."
      />

      {role === undefined ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : !isAdvisor ? (
        <p className="text-[13px]" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
          Team management is only available in Advisor view. Switch roles above to view it.
        </p>
      ) : (
        <div className="border" style={{ borderColor: "var(--lcs-line)" }}>
          <LcsTable>
            <LcsTableHead>
              <LcsTh sticky>Name</LcsTh>
              <LcsTh>Role</LcsTh>
              <LcsTh>Client companies</LcsTh>
              <LcsTh numeric>Clients</LcsTh>
            </LcsTableHead>
            <LcsTableBody>
              {TEAM_MEMBERS.map((m) => (
                <LcsTr key={m.id}>
                  <LcsTd sticky>{m.name}</LcsTd>
                  <LcsTd>{TEAM_MEMBER_ROLE_LABEL[m.role]}</LcsTd>
                  <LcsTd>{m.clientCompanies.join(", ")}</LcsTd>
                  <LcsTd numeric>{m.clientCompanies.length}</LcsTd>
                </LcsTr>
              ))}
            </LcsTableBody>
          </LcsTable>
        </div>
      )}
    </LcsPageShell>
  );
}
