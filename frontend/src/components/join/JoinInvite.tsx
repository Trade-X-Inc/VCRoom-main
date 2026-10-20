// The invitation page, /join#t=<token> (job J3b). Public: it works for a signed-out visitor.
//
// TOKEN. captureJoinFragment() (lib/join-capture, imported first by __root.tsx) has already removed the token from the
// address bar and put it in the one sessionStorage entry. This component reads it from there (lib/join-stash) and
// uses it for exactly two things: the anonymous preview call and the accept call, both as a request BODY. It is never
// put in a query string, a log, a console message, an error or an analytics event, and this page loads no third-party
// script.
//
// NO AUTOMATIC ACCEPT. Signed in and confirmed, the user sees who they are signed in as and presses a button. Opening
// the page never changes anything.
//
// ONE MESSAGE. An unknown, used, revoked, expired, wrong-address or otherwise unusable invitation all show the same
// text, so the page tells an outsider nothing about which it was.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { callAction } from "@/lib/actions/call";
import { inviteAccept } from "@/lib/actions/invite";
import {
  JOIN_CAPTURE_EVENT,
  clearStash,
  markJoinReturn,
  readStash,
} from "@/lib/join-stash";
import { joinRedirectTarget, type AcceptedInvite } from "@/lib/join-redirect";

const INVALID_MESSAGE =
  "This invitation link is invalid, has expired, or was already used. Ask the sender for a new one.";
const REFUSED_HINT =
  "Make sure you are signed in with the address the invitation was sent to.";
const UNCONFIRMED_MESSAGE =
  "Confirm your email address first. Open the confirmation message we sent, then open this invitation link from your email again.";

type Preview =
  | { state: "loading" }
  | { state: "invalid" }
  | { state: "valid"; orgName: string; roleLabel: string; expiresOn: string };
type Who =
  | { state: "checking" }
  | { state: "out" }
  | { state: "in"; email: string; id: string; confirmed: boolean };
type Accept =
  | { state: "idle" }
  | { state: "working" }
  | { state: "refused" }
  | { state: "failed" }
  | { state: "recordFailed" }
  | { state: "done"; target: string };

function formatExpiry(v: string): string {
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const CSS = `
.join-page{--ink:#16181C;--muted:#4B5058;--paper:#F5F4F1;--panel:#FFFFFF;--line:#D9D6CE;--navy:#1B3A63;--amber:#8A5A00;
  min-height:100vh;background:var(--paper);color:var(--ink);font-family:"IBM Plex Sans",Archivo,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
  display:flex;flex-direction:column;align-items:center;padding:24px 16px;box-sizing:border-box}
.join-page *{box-sizing:border-box}
.join-page .brand{width:100%;max-width:520px;font-size:20px;font-weight:600;letter-spacing:-.01em;color:var(--navy);margin:8px 0 24px}
.join-page .card{width:100%;max-width:520px;background:var(--panel);border:1px solid var(--line);border-radius:2px;padding:28px 24px}
.join-page h1{font-size:24px;line-height:1.25;margin:0 0 16px;font-weight:600;outline:none}
.join-page p{font-size:16px;line-height:1.5;margin:0 0 16px}
.join-page .muted{color:var(--muted)}
.join-page dl{margin:0 0 20px;border-top:1px solid var(--line)}
.join-page dl div{display:flex;gap:16px;padding:10px 0;border-bottom:1px solid var(--line)}
.join-page dt{flex:0 0 120px;color:var(--muted);font-size:14px}
.join-page dd{margin:0;font-size:16px;overflow-wrap:anywhere}
.join-page .actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
.join-page .btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:10px 20px;font:inherit;font-size:16px;font-weight:600;border-radius:2px;cursor:pointer;text-decoration:none;border:1px solid var(--navy)}
.join-page .btn-primary{background:var(--navy);color:#fff}
.join-page .btn-secondary{background:var(--panel);color:var(--navy)}
.join-page .btn[disabled]{opacity:.6;cursor:not-allowed}
.join-page .linkbtn{background:none;border:0;padding:10px 4px;min-height:44px;font:inherit;font-size:16px;color:var(--navy);text-decoration:underline;cursor:pointer}
.join-page .notice{border-left:4px solid var(--amber);background:#FBF7EE;padding:12px 16px;margin:0 0 16px}
.join-page .notice strong{display:block;margin-bottom:4px}
.join-page :focus-visible{outline:2px solid var(--navy);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.join-page *{transition:none!important;animation:none!important}}
`;

export function JoinInvite() {
  const [preview, setPreview] = useState<Preview>({ state: "loading" });
  const [who, setWho] = useState<Who>({ state: "checking" });
  const [accept, setAccept] = useState<Accept>({ state: "idle" });
  const tokenRef = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ready = useRef(false);

  // 1. the preview, with the anonymous role. The token goes in the request body.
  const loadPreview = useCallback(async () => {
    const token = readStash();
    tokenRef.current = token;
    if (!token) {
      setPreview({ state: "invalid" });
      return;
    }
    setPreview({ state: "loading" });
    try {
      const { data, error } = await supabase.rpc("invite_preview", {
        p_token: token,
      });
      const v = (data ?? {}) as Record<string, unknown>;
      if (
        error ||
        v.valid !== true ||
        typeof v.org_name !== "string" ||
        typeof v.role_label !== "string"
      ) {
        setPreview({ state: "invalid" });
        return;
      }
      setPreview({
        state: "valid",
        orgName: v.org_name,
        roleLabel: v.role_label,
        expiresOn: typeof v.expires_on === "string" ? v.expires_on : "",
      });
    } catch {
      setPreview({ state: "invalid" });
    }
  }, []);

  useEffect(() => {
    void loadPreview();
    // a new link pasted into this same tab
    const again = () => void loadPreview();
    window.addEventListener(JOIN_CAPTURE_EVENT, again);
    return () => window.removeEventListener(JOIN_CAPTURE_EVENT, again);
  }, [loadPreview]);

  // 2. who is signed in. The server decides on accept; this only chooses which buttons to show.
  useEffect(() => {
    let live = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      const u = data.session?.user;
      setWho(
        u
          ? {
              state: "in",
              id: u.id,
              email: u.email ?? "",
              confirmed: !!u.email_confirmed_at,
            }
          : { state: "out" },
      );
    });
    return () => {
      live = false;
    };
  }, []);

  // 3. focus moves to the heading when the page changes state (not on the very first paint)
  const phase =
    preview.state === "valid"
      ? `valid-${who.state}-${who.state === "in" ? who.confirmed : ""}-${accept.state}`
      : preview.state;
  useEffect(() => {
    if (!ready.current) {
      if (preview.state !== "loading") ready.current = true;
      else return;
    }
    headingRef.current?.focus();
  }, [phase, preview.state]);

  async function onAccept() {
    const token = tokenRef.current ?? readStash();
    if (!token || who.state !== "in" || !who.confirmed) return;
    setAccept({ state: "working" });
    try {
      const res = await callAction<AcceptedInvite>(inviteAccept, who.id, {
        token,
      });
      clearStash();
      tokenRef.current = null;
      const target = joinRedirectTarget(res);
      setAccept({ state: "done", target });
      window.location.assign(target);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "invalid_or_used") setAccept({ state: "refused" });
      else if (code === "record_failed" || code === "record_append_failed") {
        // The invitation WAS accepted; only its record entry failed.
        clearStash();
        tokenRef.current = null;
        setAccept({ state: "recordFailed" });
      } else setAccept({ state: "failed" });
    }
  }

  async function switchAccount() {
    await supabase.auth.signOut();
    markJoinReturn();
    setAccept({ state: "idle" });
    setWho({ state: "out" });
  }

  const goAuth = () => markJoinReturn();

  let heading = "Checking your invitation";
  if (preview.state === "invalid") heading = "This invitation cannot be used";
  if (preview.state === "valid")
    heading = `You have been invited to ${preview.orgName}`;
  if (accept.state === "done") heading = "Invitation accepted";
  if (accept.state === "recordFailed") heading = "Invitation accepted";

  return (
    <div className="join-page">
      <style>{CSS}</style>
      <div className="brand" aria-hidden="true">
        Lengdon
      </div>
      <main className="card" aria-labelledby="join-heading">
        <h1 id="join-heading" ref={headingRef} tabIndex={-1}>
          {heading}
        </h1>

        <div role="status" aria-live="polite">
          {preview.state === "loading" && (
            <p className="muted">This takes a moment.</p>
          )}
          {accept.state === "working" && (
            <p className="muted">Accepting the invitation…</p>
          )}
          {accept.state === "done" && <p>Taking you to your workspace.</p>}
        </div>

        {preview.state === "invalid" && (
          <>
            <p>{INVALID_MESSAGE}</p>
            <div className="actions">
              <a className="btn btn-secondary" href="/">
                Go to Lengdon
              </a>
            </div>
          </>
        )}

        {preview.state === "valid" && accept.state !== "done" && (
          <>
            {accept.state !== "recordFailed" && (
              <>
                <dl>
                  <div>
                    <dt>Organisation</dt>
                    <dd>{preview.orgName}</dd>
                  </div>
                  <div>
                    <dt>Role</dt>
                    <dd>{preview.roleLabel}</dd>
                  </div>
                  {formatExpiry(preview.expiresOn) && (
                    <div>
                      <dt>Expires</dt>
                      <dd>{formatExpiry(preview.expiresOn)}</dd>
                    </div>
                  )}
                </dl>
                <p>
                  This invitation is for one email address. Sign in with the
                  address it was sent to.
                </p>
              </>
            )}

            {who.state === "out" && (
              <div className="actions">
                <a className="btn btn-primary" href="/sign-in" onClick={goAuth}>
                  Sign in
                </a>
                <a
                  className="btn btn-secondary"
                  href="/sign-up"
                  onClick={goAuth}
                >
                  Create an account
                </a>
              </div>
            )}

            {who.state === "in" && !who.confirmed && (
              <>
                <p className="muted">You are signed in as {who.email}.</p>
                <p className="notice">
                  <strong>Email address not confirmed.</strong>
                  {UNCONFIRMED_MESSAGE}
                </p>
                <button
                  type="button"
                  className="linkbtn"
                  onClick={switchAccount}
                >
                  Sign out and switch account
                </button>
              </>
            )}

            {who.state === "in" &&
              who.confirmed &&
              accept.state !== "recordFailed" && (
                <>
                  <p>
                    You are signed in as <strong>{who.email}</strong>.
                  </p>

                  {accept.state === "refused" && (
                    <div className="notice" role="alert">
                      <strong>Invitation not accepted.</strong>
                      {INVALID_MESSAGE}
                      <br />
                      {REFUSED_HINT}
                    </div>
                  )}
                  {accept.state === "failed" && (
                    <div className="notice" role="alert">
                      <strong>The invitation could not be accepted.</strong>
                      Something went wrong. Try again in a moment.
                    </div>
                  )}

                  <div className="actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={onAccept}
                      disabled={accept.state === "working"}
                    >
                      Accept the invitation
                    </button>
                    <button
                      type="button"
                      className="linkbtn"
                      onClick={switchAccount}
                    >
                      Sign out and switch account
                    </button>
                  </div>
                </>
              )}

            {accept.state === "recordFailed" && (
              <>
                <p>
                  Your invitation was accepted, but a record entry could not be
                  written. Open the app to continue.
                </p>
                <div className="actions">
                  <a className="btn btn-primary" href="/app">
                    Open the app
                  </a>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
