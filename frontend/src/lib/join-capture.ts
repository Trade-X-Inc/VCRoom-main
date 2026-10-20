// Side-effect module: runs captureJoinFragment() as soon as the app's code starts, before any component renders, so the
// invitation token leaves the address bar before anything else can read it. Imported by __root.tsx. A new fragment on
// the same page (a link pasted into the same tab) is handled by the hashchange listener.
import { captureJoinFragment } from "@/lib/join-stash";

captureJoinFragment();
if (typeof window !== "undefined")
  window.addEventListener("hashchange", captureJoinFragment);
