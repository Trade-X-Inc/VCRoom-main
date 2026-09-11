import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LcsButton } from "@/components/lcs";
import { type LcsViewerRole, VIEWER_ROLE_LABEL } from "@/lib/lcs-sandbox";

// Sector-layer restructure, checkpoint 3 (1 Sep 2026). Lives in
// LcsPageShell's headerExtra slot (added for exactly this) so it's
// available from every deals-preview screen, not just the hub — real
// gap found live: Founder role redirects away from the hub instantly
// (see deals-preview.index.tsx's header comment), so a switcher that
// only existed on the hub page left Founder mode with no visible way
// back to Investor/Advisor, only a localStorage edit. One implementation,
// rendered everywhere via the shell slot, rather than duplicated
// per-route or re-added piecemeal each time a redirect strands a role.
//
// Deliberately NOT part of LcsPageShell itself — that's a shared
// Component System primitive used by every LCS screen including
// lcs-preview.tsx, which has no concept of a viewer role at all. This
// component owns the role concept; the shell just gives it a place to
// render.

const VIEWER_ROLE_KEY = "lcs-viewer-role";
/** Dispatched on every role change, in addition to the localStorage write.
 * Needed because the native `storage` event never fires in the same tab
 * that made the write (only other tabs get it) — and a same-route
 * `replace` navigation (Founder clicked while already on the hub) doesn't
 * remount the hub either, so its own mount-only localStorage read never
 * re-runs. Found live: the redirect from the hub's own founder-mode
 * effect silently never fired when Founder was chosen from the hub
 * itself, because nothing told the hub's already-mounted `role` state it
 * was stale. This event is the fix — any mounted listener re-reads
 * localStorage itself rather than trusting the event's payload, so it's
 * a pure "something changed, go check" signal, not a state carrier. */
export const VIEWER_ROLE_CHANGE_EVENT = "lcs-viewer-role-change";
const ROLES: LcsViewerRole[] = ["founder", "investor", "advisor"];

function isViewerRole(value: string | null): value is LcsViewerRole {
  return value === "founder" || value === "investor" || value === "advisor";
}

export function RoleSwitcher() {
  const navigate = useNavigate();
  // undefined = not yet hydrated. Same hydration-safe pattern as every
  // other localStorage read in this build — render nothing meaningful
  // during SSR/first paint, swap in the real value after mount, so
  // server and client renders agree on first paint.
  const [role, setRole] = useState<LcsViewerRole | undefined>(undefined);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(VIEWER_ROLE_KEY);
    } catch {
      /* private window / storage blocked — default to founder */
    }
    setRole(isViewerRole(stored) ? stored : "founder");
  }, []);

  const handleChange = (next: LcsViewerRole) => {
    setRole(next);
    try {
      localStorage.setItem(VIEWER_ROLE_KEY, next);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(VIEWER_ROLE_CHANGE_EVENT));
    // Always return to the hub on role change, regardless of which
    // screen the switcher was clicked from — the hub is the canonical
    // entry point for every role (sector picker for investor/advisor,
    // the redirect launch point for founder). Using replace so the
    // previous role's screen doesn't linger in browser history as a
    // dead end for the new role.
    navigate({ to: "/deals-preview", replace: true });
  };

  if (role === undefined) {
    // Reserve the collapsed-state width so the header doesn't visibly
    // shift once hydration fills this in — same discipline as every
    // other pre-hydration placeholder in this build, just sized rather
    // than fully blank since this sits inline in a header row.
    return <div aria-hidden="true" style={{ width: 96, height: 28 }} />;
  }

  return (
    <div className="flex items-center gap-0.5 border p-0.5" style={{ borderColor: "var(--lcs-line)" }}>
      {ROLES.map((r) => {
        const active = role === r;
        return (
          <LcsButton
            key={r}
            variant={active ? "primary" : "text-link"}
            onClick={() => handleChange(r)}
            aria-label={VIEWER_ROLE_LABEL[r]}
            aria-pressed={active}
            style={
              active
                ? { height: 28, padding: "0 10px" }
                : { height: 28, padding: "0 10px", textDecoration: "none" }
            }
          >
            {/* Full label at md+ (real header width available); a single
                initial below that, matching the sidebar nav's own
                collapsed-icon convention so a narrow header stays
                readable without the switcher alone forcing horizontal
                overflow — the header already carries hamburger + search
                + notifications + user avatar below md. */}
            <span className="hidden md:inline">{VIEWER_ROLE_LABEL[r]}</span>
            <span className="md:hidden" aria-hidden="true">{VIEWER_ROLE_LABEL[r][0]}</span>
          </LcsButton>
        );
      })}
    </div>
  );
}
