// Pure state handling for the Cloudflare Turnstile widget (Supabase CAPTCHA).
//
// A Turnstile token is SINGLE-USE and short-lived. The rules this module
// encodes, so they can be tested without a browser:
//   - submit is possible only while a token exists (status "verified");
//   - taking the token for a request clears it at once (consume), so the same
//     token can never be sent twice;
//   - after any attempt that used a token the widget must be reset, which puts
//     the state back to "verifying";
//   - an expired token is dropped and the widget reset;
//   - a script or widget failure is a visible, retryable state. It is never
//     treated as permission to submit without a token;
//   - "loading" is not an error: nothing red is shown until something has
//     actually failed.

export type TurnstileStatus =
  | "loading" // script or widget not ready yet
  | "verifying" // widget rendered, challenge running or waiting for the visitor
  | "verified" // a token exists
  | "expired" // the token lapsed before it was used
  | "error" // the widget reported an error
  | "unavailable"; // script failed to load, timed out, or no site key is configured

export interface TurnstileState {
  status: TurnstileStatus;
  token: string | null;
}

export type TurnstileEvent =
  | { type: "loading" }
  | { type: "rendered" }
  | { type: "token"; token: string }
  | { type: "expired" }
  | { type: "error" }
  | { type: "unavailable" }
  | { type: "consume" }
  | { type: "reset" };

export const INITIAL_TURNSTILE_STATE: TurnstileState = { status: "loading", token: null };

export function turnstileReducer(state: TurnstileState, event: TurnstileEvent): TurnstileState {
  switch (event.type) {
    case "loading":
      return { status: "loading", token: null };
    case "rendered":
      // Only meaningful while we were still loading; a later render never undoes a token or an error.
      return state.status === "loading" ? { status: "verifying", token: null } : state;
    case "token":
      // An empty token is not a token.
      return event.token ? { status: "verified", token: event.token } : state;
    case "expired":
      return { status: "expired", token: null };
    case "error":
      return { status: "error", token: null };
    case "unavailable":
      return { status: "unavailable", token: null };
    case "consume":
      // The token has been handed to a request. It must not be reusable.
      return state.token ? { status: "verifying", token: null } : state;
    case "reset":
      // After a widget reset the challenge runs again; a missing widget stays unavailable.
      return state.status === "unavailable" ? state : { status: "verifying", token: null };
    default:
      return state;
  }
}

/** Submit is allowed only with a live token. Nothing else ever enables it. */
export function canSubmit(state: TurnstileState): boolean {
  return state.status === "verified" && !!state.token;
}

/** Text for the visible status line and the polite live region. */
export function statusText(state: TurnstileState): string {
  switch (state.status) {
    case "loading":
      return "Loading security check…";
    case "verifying":
      return "Verifying…";
    case "verified":
      return "Verified";
    case "expired":
      return "The security check expired. Verifying again…";
    case "error":
      return "The security check failed. Try again.";
    case "unavailable":
      return "The security check could not load. Check your connection and try again.";
  }
}

/** Only these two states are failures the visitor needs to act on. */
export function isFailure(state: TurnstileState): boolean {
  return state.status === "error" || state.status === "unavailable";
}

/** The token to send as options.captchaToken, or undefined when none is available. */
export function tokenForRequest(state: TurnstileState): string | undefined {
  return canSubmit(state) ? (state.token as string) : undefined;
}

/** Build the Supabase auth options for a request that needs a captcha token. */
export function captchaOptions(token: string | undefined): { captchaToken: string } | Record<string, never> {
  return token ? { captchaToken: token } : {};
}
