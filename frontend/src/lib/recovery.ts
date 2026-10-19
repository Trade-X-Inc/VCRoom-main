// Marks a browser session that came from a password-reset email link.
//
// Supabase emits PASSWORD_RECOVERY once, as the recovery link is processed.
// The app's single auth listener (lib/auth-store.ts) records it here
// synchronously, because the callback page mounts later and would otherwise
// miss the event. /auth/callback then sends the visitor to /reset-password,
// and /reset-password only works while the mark is present: a normal signed-in
// session must never be able to change the password without the old one.
//
// sessionStorage, not localStorage: the mark belongs to this tab and goes away
// when it closes. Every access is wrapped; storage can be blocked.

const KEY = "lcs_recovery_session";
const MAX_AGE_MS = 60 * 60 * 1000; // a recovery link is short-lived; so is the mark

export function markRecoverySession(now: number = Date.now()): void {
  try {
    sessionStorage.setItem(KEY, String(now));
  } catch {
    /* storage unavailable */
  }
}

export function isRecoverySession(now: number = Date.now()): boolean {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && now - at >= 0 && now - at <= MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function clearRecoverySession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
