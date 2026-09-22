import { useCallback, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { verifyStepUp } from "@/lib/step-up-fn";

// Password re-entry step-up — client wiring (Gate C client, 22 Sep 2026).
//
// ONE shared hook backs the ONE shared <StepUpModal/> for every gated
// action, rather than each of the three real call sites (and, later, the
// three UI-less ones) reimplementing its own "catch STEP_UP_REQUIRED, show
// a password prompt, resubmit" logic.
//
// GENERIC OVER SHAPE, DELIBERATELY: the six gated server-fns are NOT
// uniform. Three go through callAction() (throws on failure); three are
// called directly as createServerFn results (return {ok:false,error} —
// never throw on a normal business failure). This hook does not force any
// call site onto a different invocation contract than it already uses —
// wrapGated() accepts a thunk that resolves with a shape carrying
// {ok, error?}, whatever else it also carries, and detects
// error === "STEP_UP_REQUIRED" as the trigger. A thrown Error is also
// treated as a normal failure and NOT specially handled here — the two
// throwing call sites in this codebase (callAction) would need their own
// try/catch around wrapGated to surface a thrown "STEP_UP_REQUIRED"; none
// of the three actions wired at Step 4 use callAction, so this is scoped
// to what's real today, not built speculatively for a shape nothing uses.
//
// RESUBMISSION: on a successful password check, the ORIGINAL call is
// re-run with the SAME original arguments plus stepUpToken attached — not
// a new action, not a guess at what the user meant. The caller passes a
// factory (buildEnvelope: (stepUpToken) => envelope) precisely so the
// original input is captured once, at the call site, and threaded through
// unchanged on resubmit.
//
// FAILURE HANDLING — never a dead end: a wrong password re-opens the SAME
// modal with a specific inline message and the password field cleared and
// refocused (see StepUpModal). Rate limiting and other verifyPassword()
// errors get their own specific message rather than a generic one. The
// user can retry immediately or cancel; nothing is lost from the original
// action's inputs, since resubmission always replays the captured
// buildEnvelope from the initial attempt.

type StepUpAwareResult = { ok: boolean; error?: string; [k: string]: unknown };

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

function messageForVerifyError(error: string): string {
  switch (error) {
    case "invalid_password":
      return "That password isn't right. Try again.";
    case "rate_limited":
      return "Too many attempts. Wait a moment and try again.";
    case "not_authenticated":
      return "Your session has expired. Please sign in again.";
    default:
      return "Couldn't verify your password. Try again.";
  }
}

export function useStepUpGate() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Holds the pending resubmission: a function that, given a fresh
  // step-up token, re-runs the ORIGINAL call and resolves/rejects exactly
  // as the caller's own await would have. Set only while the modal is open.
  const pendingRef = useRef<{
    resubmit: (stepUpToken: string) => Promise<unknown>;
    resolve: (v: unknown) => void;
    reject: (e: unknown) => void;
  } | null>(null);

  const cancel = useCallback(() => {
    setOpen(false);
    setBusy(false);
    setError(null);
    // A cancelled step-up is not a retryable failure of the original
    // action — it's the user declining to proceed. Reject with a distinct,
    // named error so a call site's catch block can tell "declined" apart
    // from "verification failed" or "the underlying action failed", should
    // it ever want to (none of the three wired call sites currently branch
    // on this, they just stop spinning — see each site's own change).
    pendingRef.current?.reject(new Error("STEP_UP_CANCELLED"));
    pendingRef.current = null;
  }, []);

  const submitPassword = useCallback(async (password: string) => {
    const pending = pendingRef.current;
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      const verified = await verifyStepUp({ data: { accessToken, password } });
      if (!verified.ok) {
        setError(messageForVerifyError(verified.error));
        setBusy(false);
        return; // re-prompt in place — modal stays open, field cleared by StepUpModal's own effect
      }

      // Password confirmed, token minted — resubmit the ORIGINAL action
      // with it attached, exactly as the caller originally invoked it.
      const result = await pending.resubmit(verified.token);
      setOpen(false);
      setBusy(false);
      setError(null);
      pendingRef.current = null;
      pending.resolve(result);
    } catch (e) {
      // The resubmitted action itself failed for a reason OTHER than
      // step-up (e.g. a real business error, or STEP_UP_REQUIRED again if
      // the token were somehow rejected — see the note on single-use
      // tokens below). Close the modal and let the ORIGINAL caller's own
      // catch/error handling deal with it, exactly as if the very first
      // call had failed that way — the step-up layer doesn't swallow or
      // reinterpret the underlying action's own errors.
      setOpen(false);
      setBusy(false);
      setError(null);
      pendingRef.current = null;
      pending.reject(e);
    }
  }, []);

  /**
   * Wraps a single gated call. `attempt(stepUpToken?)` is the SAME call the
   * site would normally make — first invoked with no token, then (if it
   * comes back STEP_UP_REQUIRED) re-invoked with a fresh one once the user
   * confirms their password. The token is single-use (Gate B/C), so this
   * never reuses one across two resubmit attempts — each password entry
   * mints its own.
   */
  const wrapGated = useCallback(
    <T extends StepUpAwareResult>(attempt: (stepUpToken?: string) => Promise<T>): Promise<T> => {
      return attempt().then((first) => {
        if (first.ok || first.error !== "STEP_UP_REQUIRED") return first;

        return new Promise<T>((resolve, reject) => {
          pendingRef.current = {
            resubmit: (token) => attempt(token),
            resolve: resolve as (v: unknown) => void,
            reject,
          };
          setError(null);
          setOpen(true);
        });
      });
    },
    [],
  );

  return {
    /** Pass straight through to <StepUpModal open busy error onSubmit={submitPassword} onCancel={cancel} />. */
    modalProps: { open, busy, error, onSubmit: submitPassword, onCancel: cancel },
    /** Wrap any gated call: wrapGated((token) => myAction({ data: { ..., stepUpToken: token } })) */
    wrapGated,
  };
}
