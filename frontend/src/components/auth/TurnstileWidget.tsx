import { useCallback, useEffect, useReducer, useRef, useState, type RefObject } from "react";
import {
  INITIAL_TURNSTILE_STATE,
  canSubmit,
  isFailure,
  statusText,
  turnstileReducer,
  type TurnstileState,
} from "@/lib/turnstile";

// Cloudflare Turnstile, explicit rendering, no extra dependency. Supabase Auth
// has CAPTCHA protection on, so password sign-in, sign-up and password reset
// each need a fresh token as options.captchaToken (see lib/turnstile.ts for
// the single-use rules). Google OAuth does not use it.
//
// CSP: script-src, frame-src and connect-src already allow
// https://challenges.cloudflare.com (scripts/patch-wrangler.mjs). The script is
// loaded from that host, so it needs no nonce.

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const LOAD_TIMEOUT_MS = 15000;

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = SCRIPT_SRC;
    tag.async = true;
    tag.defer = true;
    tag.onload = () => (window.turnstile ? resolve() : reject(new Error("turnstile missing")));
    tag.onerror = () => {
      tag.remove();
      scriptPromise = null; // allow a retry to load it again
      reject(new Error("turnstile script failed"));
    };
    document.head.appendChild(tag);
  });
  return scriptPromise;
}

function siteKey(): string {
  return (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? "";
}

export interface TurnstileHandle {
  state: TurnstileState;
  /** True only while a live token exists. Use it to disable the submit button. */
  ready: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  /** Run `fn` with the single-use token; the widget is reset afterwards, always. Returns null when no token. */
  withToken: <T>(fn: (token: string) => Promise<T>) => Promise<T | null>;
  /** Reset the widget (new challenge) and clear the token. */
  reset: () => void;
  /** Reload the script and widget after a failure. */
  retry: () => void;
}

export function useTurnstile(): TurnstileHandle {
  const [state, dispatch] = useReducer(turnstileReducer, INITIAL_TURNSTILE_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const key = siteKey();
    if (!key) {
      dispatch({ type: "unavailable" });
      return;
    }
    dispatch({ type: "loading" });
    const timer = window.setTimeout(() => {
      if (!cancelled && widgetId.current === null) dispatch({ type: "unavailable" });
    }, LOAD_TIMEOUT_MS);

    loadScript()
      .then(() => {
        const el = containerRef.current;
        if (cancelled || !el || !window.turnstile) return;
        const onExpired = () => {
          // The token lapsed unused: drop it and start a new challenge.
          dispatch({ type: "expired" });
          if (widgetId.current) window.turnstile?.reset(widgetId.current);
        };
        widgetId.current = window.turnstile.render(el, {
          sitekey: key,
          theme: "light",
          callback: (token: string) => dispatch({ type: "token", token }),
          "expired-callback": onExpired,
          "error-callback": () => dispatch({ type: "error" }),
          "timeout-callback": onExpired,
        });
        dispatch({ type: "rendered" });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "unavailable" });
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (widgetId.current) {
        try {
          window.turnstile?.remove(widgetId.current);
        } catch {
          /* widget already gone */
        }
        widgetId.current = null;
      }
    };
  }, [attempt]);

  const reset = useCallback(() => {
    if (widgetId.current) {
      try {
        window.turnstile?.reset(widgetId.current);
      } catch {
        /* widget already gone */
      }
    }
    dispatch({ type: "reset" });
  }, []);

  const withToken = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T | null> => {
      const current = stateRef.current;
      if (!canSubmit(current)) return null;
      const token = current.token as string;
      dispatch({ type: "consume" });
      stateRef.current = { status: "verifying", token: null }; // block a second submit before React re-renders
      try {
        return await fn(token);
      } finally {
        reset();
      }
    },
    [reset],
  );

  const retry = useCallback(() => {
    widgetId.current = null;
    setAttempt((n) => n + 1);
  }, []);

  return { state, ready: canSubmit(state), containerRef, withToken, reset, retry };
}

/**
 * Renders the widget, a visible status line and a polite live region.
 * The container keeps a stable height so the page does not jump while loading.
 */
export function TurnstileWidget({ handle }: { handle: TurnstileHandle }) {
  const failure = isFailure(handle.state);
  const text = statusText(handle.state);
  return (
    <div role="group" aria-label="Security check" style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: "100%" }}>
      <div ref={handle.containerRef} style={{ minHeight: 65, maxWidth: "100%", overflow: "hidden" }} />
      <p
        role="status"
        aria-live="polite"
        data-testid="turnstile-status"
        style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: failure ? "#92400e" : "#425466" }}
      >
        {text}
      </p>
      {failure ? (
        <button
          type="button"
          onClick={handle.retry}
          style={{
            alignSelf: "flex-start",
            minHeight: 44,
            minWidth: 44,
            padding: "0 16px",
            border: "1px solid #0a2540",
            background: "#fff",
            color: "#0a2540",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
