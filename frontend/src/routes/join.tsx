import { createFileRoute } from "@tanstack/react-router";
import { JoinInvite } from "@/components/join/JoinInvite";
import { LegacyTeamJoin } from "@/components/join/LegacyTeamJoin";
import { INLINE_JOIN_CAPTURE_SOURCE } from "@/lib/join-stash";

// /join is the invitation page. The link in an invitation email is https://lengdon.com/join#t=<token>: the token is
// in the URL FRAGMENT, removed from the address bar at start-up (lib/join-capture) and kept in one sessionStorage
// entry (lib/join-stash). The page itself is components/join/JoinInvite.tsx.
//
// The OLD team-invitation link, /join?token=<uuid>, still works: it renders the unchanged legacy page until the old
// invite tables are retired (CLAUDE.md §20.28). A new-style link never has a query string.
//
// Headers: the worker sends Referrer-Policy: no-referrer, noindex, no-transform and a script policy without third-party
// hosts for /join (scripts/patch-wrangler.mjs); the meta tags below say the same for anything that ignores headers.
export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Accept an invitation | Lengdon" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
    // Runs while the HTML is parsed, before the first paint: takes the token out of the address bar and stashes it.
    scripts: [{ children: INLINE_JOIN_CAPTURE_SOURCE }],
  }),
  component: JoinRoute,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
});

function JoinRoute() {
  const { token } = Route.useSearch();
  return token ? <LegacyTeamJoin token={token} /> : <JoinInvite />;
}
