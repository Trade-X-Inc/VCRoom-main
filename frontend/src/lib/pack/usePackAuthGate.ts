import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";

// Auth state for the /pack screens, read from the same store the routes' beforeLoad gate reads
// (useAuthStore: `initialized` and `user`, set by the single auth listener in __root.tsx).
//
// Why the screens need this on top of beforeLoad: beforeLoad redirects only when the store is already
// initialised. On a direct load of a /pack URL it runs BEFORE the session has resolved, so it lets the
// visitor through and nothing redirects later. This hook adds the missing half: once the store has
// resolved and holds no user, it sends the visitor to /sign-in with the same options beforeLoad uses.
// (/sign-in has no redirect-back parameter, so none is passed.)
export function usePackAuthGate(): {
  authInitialized: boolean;
  hasUser: boolean;
  redirecting: boolean;
} {
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const redirecting = initialized && !user;
  useEffect(() => {
    if (redirecting) navigate({ to: "/sign-in", search: {}, replace: true });
  }, [redirecting, navigate]);
  return { authInitialized: initialized, hasUser: !!user, redirecting };
}
