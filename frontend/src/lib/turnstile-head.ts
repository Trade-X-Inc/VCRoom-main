// Start Turnstile before the page hydrates. The script tag is part of the server-rendered <head>, so the browser
// fetches it while the app bundle is still loading; the widget then renders as soon as the page is interactive
// instead of after the bundle, hydration and a second round trip for the script (measured 20 Oct 2026: the script
// request used to begin 0.3 to 1.0 s after navigation, after hydration). The host is already allowed by the
// Content-Security-Policy (script-src, frame-src, connect-src), so nothing in the policy changes.
export const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const TURNSTILE_HEAD = {
  links: [{ rel: "preconnect", href: "https://challenges.cloudflare.com" }],
  scripts: [{ src: TURNSTILE_SCRIPT_SRC, defer: true }],
};
