import { useCallback, useEffect, useRef, useState } from "react";
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

// Landing spot when the original trigger element is gone (unmounted, not
// merely disabled) by the time focus needs to be restored — see
// restoreFocus's own comment for the real call site this was found on.
// <main> is a real DOM landmark, present on every authenticated route,
// so this never depends on anything call-site-specific existing.
function focusFallbackLandmark() {
  const main = document.querySelector("main");
  if (!main) return;
  const hadTabIndex = main.hasAttribute("tabindex");
  if (!hadTabIndex) main.setAttribute("tabindex", "-1");
  (main as HTMLElement).focus();
  // Only programmatically-focusable via the tabindex we just added —
  // remove it after use so <main> doesn't linger in the normal Tab order.
  if (!hadTabIndex) main.removeAttribute("tabindex");
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

  // The element that was clicked to trigger the currently-open modal.
  // Restored on close so focus never ends up stranded on <body>.
  //
  // NOT captured via document.activeElement read inside wrapGated — traced
  // live (a patched activeElement getter logging every read + call stack)
  // and found that by the time wrapGated's own body runs,
  // document.activeElement is ALREADY <body>, not the clicked button. Every
  // real call site does setBusy/setGenerating(true) — which disables the
  // button — then, in several of them (generateInviteLink's handleGenerate
  // specifically), an `await import(...)` before wrapGated is even called;
  // that await yields to the browser, React flushes the disabled state,
  // and a disabled element blurs itself. This happens BEFORE wrapGated's
  // first line runs, not after, so capturing inside wrapGated is too late
  // regardless of where in its body the read happens.
  //
  // Fixed with a capture-phase document click listener instead — captured
  // in the browser's native event capture phase, which runs before ANY
  // React synthetic event handler (including the onClick that calls
  // setBusy), so it is provably immune to this class of timing gap rather
  // than newly vulnerable to a different one.
  const lastClickedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest("button, a, [role='button'], input, select, textarea") as HTMLElement | null;
      if (el) lastClickedRef.current = el;
    };
    // capture: true — runs before React's own listeners, which are
    // attached at the root in the bubble phase.
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  const triggerRef = useRef<HTMLElement | null>(null);

  // Restores focus to the element that triggered the gated action, then
  // clears the ref. Called on every path that closes the modal (cancel,
  // and both branches of submitPassword below) so focus never ends up
  // stranded on <body> regardless of how the modal closed.
  //
  // Retries across a few animation frames rather than focusing once,
  // synchronously — found live: the trigger button is still DISABLED at
  // the exact instant this runs (the call site's own busy/generating
  // state, which controls the disabled attribute, only clears in ITS
  // OWN finally block, which runs after wrapGated's returned promise
  // settles — i.e. after this function has already been called once).
  // .focus() on a currently-disabled element is a silent no-op in every
  // real browser, so a single attempt landed on <body> every time,
  // despite triggerRef correctly holding the real, still-connected
  // button. Bounded to a handful of frames (~1s) so a button that never
  // re-enables (element removed, component unmounted) doesn't retry
  // forever; document.activeElement is re-checked after each attempt
  // rather than assumed to have worked.
  //
  // FALLBACK TO <main> ON A GONE TRIGGER — found live, adversarially
  // testing a successful submit specifically (Escape/Cancel had already
  // been proven correct): generateInviteLink's own call site swaps its
  // "Generate invite link" button out for a link-display panel the
  // instant the mint succeeds (query invalidation flips `link` from null
  // to a value, and the button's whole JSX branch is replaced) — the
  // trigger isn't merely re-enabled, it's unmounted. A trigger that's
  // gone by design (not a bug — the button becoming the thing it created
  // is the intended UX) still needs *somewhere* sane to land, so this
  // falls back to the nearest <main> landmark, present on every
  // authenticated route.
  //
  // THE RACE THAT MADE THIS TWO-PART, found by instrumenting
  // HTMLElement.prototype.focus itself: el.isConnected was NOT the
  // reliable signal it looks like. React kept the button connected long
  // enough for .focus() to succeed — document.activeElement === el right
  // after the call — and tryFocus correctly declared success and
  // returned. React then unmounted the node ~10ms later, on the very
  // next render, moving focus to <body> with nothing left watching for
  // it. A one-shot "did it work" check can't see a success that gets
  // invalidated microtasks later, so a MutationObserver on el's parent
  // stays armed for a short window after the declared success and
  // re-routes to the fallback landmark if el is actually removed —
  // covering the case where isConnected was true at check time but the
  // element was already on its way out.
  const restoreFocus = useCallback(() => {
    const el = triggerRef.current;
    triggerRef.current = null;
    if (!el) return;

    const watchForRemoval = () => {
      const parent = el.parentNode;
      if (!parent) return; // nothing to observe — already detached
      const observer = new MutationObserver(() => {
        if (!el.isConnected) {
          observer.disconnect();
          focusFallbackLandmark();
        }
      });
      observer.observe(parent, { childList: true });
      // El survived a full render cycle without being removed — this
      // wasn't a mid-unmount success, it's a real, stable focus. Stop
      // watching so this doesn't outlive the interaction it belongs to.
      setTimeout(() => observer.disconnect(), 1000);
    };

    let attempts = 0;
    const tryFocus = () => {
      if (!el.isConnected) {
        focusFallbackLandmark();
        return;
      }
      el.focus();
      if (document.activeElement === el) {
        watchForRemoval();
        return; // succeeded — but see watchForRemoval for why this isn't final
      }
      attempts += 1;
      if (attempts < 30) requestAnimationFrame(tryFocus); // ~30 frames, generous margin over any real busy-state clear
      else focusFallbackLandmark(); // never re-enabled/reconnected — give up on el, not on focus itself
    };
    tryFocus();
  }, []);

  const cancel = useCallback(() => {
    setOpen(false);
    setBusy(false);
    setError(null);
    restoreFocus();
    // A cancelled step-up is not a retryable failure of the original
    // action — it's the user declining to proceed. Reject with a distinct,
    // named error so a call site's catch block can tell "declined" apart
    // from "verification failed" or "the underlying action failed", should
    // it ever want to (none of the three wired call sites currently branch
    // on this, they just stop spinning — see each site's own change).
    pendingRef.current?.reject(new Error("STEP_UP_CANCELLED"));
    pendingRef.current = null;
  }, [restoreFocus]);

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
      restoreFocus();
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
      restoreFocus();
      pendingRef.current = null;
      pending.reject(e);
    }
  }, [restoreFocus]);

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
      // The most recent real pointerdown target, captured in the capture
      // phase — see lastClickedRef's own comment above for why a
      // document.activeElement read (even here, at the top of wrapGated)
      // is unreliable.
      const trigger = lastClickedRef.current;

      return attempt().then((first) => {
        if (first.ok || first.error !== "STEP_UP_REQUIRED") return first;

        return new Promise<T>((resolve, reject) => {
          triggerRef.current = trigger;
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
