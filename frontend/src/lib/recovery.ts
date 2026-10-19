// Password-recovery sessions.
//
// A session that came from a password-reset link is a FULL session. Until the
// user sets a new password (or signs out) it must not reach any other page, so
// the app records a "recovery mark" and /reset-password is the only place that
// can clear it by completing the change.
//
// WHY THE MARK IS SET FROM THE URL, NOT FROM THE AUTH EVENT (found 20 Oct 2026,
// the H4 reset link signed the user straight into the dashboard): auth-js
// delivers PASSWORD_RECOVERY inside setTimeout(0) AFTER the initialization
// promise resolves (GoTrueClient._initialize), so a page that awaits
// getSession() and then checks the mark runs one task BEFORE the event. The
// URL is known at once, so lib/recovery-capture.ts reads it synchronously when
// the app starts, before auth-js has processed or cleared the hash. The auth
// listener still sets the mark on PASSWORD_RECOVERY as a second path (this is
// the only signal for a PKCE code exchange, whose URL carries no type).
//
// localStorage, not sessionStorage: the session itself lives in localStorage and
// survives a closed tab, so the mark must survive it too, otherwise reopening the
// site would skip the new-password screen. No expiry: it ends on a password
// change, sign-out, or when /reset-password finds there is no session to protect.

const KEY = "lcs_recovery_session";
const EVENT = "lcs-recovery-change";

function notify(): void {
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* no window */
  }
}

export function markRecoverySession(): void {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
  notify();
}

export function isRecoverySession(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function clearRecoverySession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  notify();
}

export const RECOVERY_CHANGE_EVENT = EVENT;

/**
 * True when the address is a recovery landing, in any style Supabase uses:
 * `#...&type=recovery` (implicit, token in the hash) or `?type=recovery`
 * (token_hash verify link). It does not look at redirect_to: it reads what the
 * browser actually opened.
 */
export function urlIsRecovery(href: string): boolean {
  try {
    const u = new URL(href, "https://placeholder.invalid");
    const hash = new URLSearchParams(u.hash.replace(/^#/, ""));
    return (
      hash.get("type") === "recovery" ||
      u.searchParams.get("type") === "recovery"
    );
  } catch {
    return false;
  }
}

// Pages a recovery session may still open: the new-password screen itself, the
// callback that routes here, asking for another link, and the legal pages.
// Everything else, including every signed-in area and /sign-in, is blocked; the
// way out is "Cancel and sign out" on /reset-password. (/sign-in is blocked
// because an app page that sees no session yet redirects there, which would
// otherwise strand a recovery landing on the sign-in form.)
const ALLOWED = [
  "/reset-password",
  "/forgot-password",
  "/auth/callback",
  "/legal",
];

export function pathAllowedDuringRecovery(pathname: string): boolean {
  if (pathname.startsWith("/api/") || pathname.startsWith("/_")) return true; // framework and report endpoints
  return ALLOWED.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * For a bare PKCE code (whose address carries no type): the user just came from a recovery email if one was sent
 * to them within the last 10 minutes and they signed in within the last minute. Only used on that path.
 */
export function isFreshRecoveryUser(
  user:
    { recovery_sent_at?: string; last_sign_in_at?: string } | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!user?.recovery_sent_at || !user.last_sign_in_at) return false;
  const sent = Date.parse(user.recovery_sent_at);
  const signedIn = Date.parse(user.last_sign_in_at);
  if (!Number.isFinite(sent) || !Number.isFinite(signedIn)) return false;
  return (
    now - sent <= 10 * 60 * 1000 &&
    now - signedIn <= 60 * 1000 &&
    signedIn >= sent
  );
}
