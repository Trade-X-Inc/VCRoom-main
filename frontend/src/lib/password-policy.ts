// Rules for a NEW password set by the visitor (reset flow). Pure, so the same
// check runs in the form and in tests. Supabase hashes with bcrypt, which
// ignores bytes after 72, so longer input is refused rather than silently cut.

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_BYTES = 72;

export type PasswordProblem = "too_short" | "too_long" | "mismatch" | "empty_confirm";

export function validateNewPassword(password: string, confirm: string): PasswordProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "too_short";
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) return "too_long";
  if (!confirm) return "empty_confirm";
  if (password !== confirm) return "mismatch";
  return null;
}

export function passwordProblemText(problem: PasswordProblem): string {
  switch (problem) {
    case "too_short":
      return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    case "too_long":
      return `Use at most ${MAX_PASSWORD_BYTES} bytes (about ${MAX_PASSWORD_BYTES} plain characters).`;
    case "empty_confirm":
      return "Type the new password again to confirm it.";
    case "mismatch":
      return "The two passwords do not match.";
  }
}
