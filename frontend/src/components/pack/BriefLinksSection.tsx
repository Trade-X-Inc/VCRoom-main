import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callAction } from "@/lib/actions/call";
import {
  briefLinkCreate,
  briefLinkList,
  briefLinkRevoke,
  briefLinkSetExpiry,
} from "@/lib/actions/brief-link";
import {
  BRIEF_DEFAULT_EXPIRY_DAYS,
  BRIEF_EXPIRY_OPTIONS,
  BRIEF_LABEL_MAX,
  briefLinkErrorMessage,
  briefLinkUrl,
  checkLabel,
  createGate,
  expiryChangeGate,
  expiryLabel,
  formatDate,
  labelCounter,
  relativeTime,
  sortNewestFirst,
  statusText,
  type BriefLink,
  type BriefLinkStatus,
} from "@/lib/pack/brief-link";
import { PackField } from "./Field";
import { packInputStyle } from "./field-styles";
import {
  LcsButton,
  LcsCard,
  LcsEmptyState,
  LcsSkeletonRows,
  LcsStatusPill,
  type LcsStatus,
} from "@/components/lcs";

// Brief links manager (slice S1). Rendered only when the build-time flag VITE_BRIEF_LINKS_ENABLED is "true"
// (see routes/pack.$packId.tsx). Founder side only: create a link with a label and an expiry, see the links,
// change an expiry, revoke.
//
// THE TOKEN. brief_link_create returns the link token once. It is held here in `shown` (component state) and
// nowhere else: not in the react-query cache (the create and the other calls are plain async handlers, not
// mutations or queries), not in a URL, localStorage or sessionStorage, and never logged. Dismissing the panel,
// leaving the page or reloading drops it. The list the server returns never contains it.

const STATUS_PILL: Record<BriefLinkStatus, LcsStatus> = {
  active: "satisfied",
  expired: "attention",
  revoked: "pending",
};

const small: React.CSSProperties = {
  fontFamily: "var(--font-lcs-ui)",
  fontSize: 12,
  color: "var(--lcs-ink-muted)",
};
const alertBox: React.CSSProperties = {
  background: "var(--lcs-attention-wash)",
  border: "1px solid var(--lcs-attention)",
  color: "var(--lcs-ink)",
};

export function BriefLinksSection({
  packId,
  scopeId,
}: {
  packId: string;
  scopeId: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["brief-links", packId];
  const {
    data,
    status,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey,
    enabled: !!scopeId,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAction<{ ok: true; links: BriefLink[] }>(briefLinkList, scopeId, {
        packId,
      }),
  });
  const links = sortNewestFirst(data?.links ?? []);

  // create form
  const [label, setLabel] = useState("");
  const [days, setDays] = useState<number>(BRIEF_DEFAULT_EXPIRY_DAYS);
  const [labelTouched, setLabelTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // the one-time link: { url, label }. Memory only.
  const [shown, setShown] = useState<{ url: string; label: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const labelRef = useRef<HTMLInputElement | null>(null);
  const shownRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const labelCheck = checkLabel(label);
  const labelError =
    !labelCheck.ok && (labelTouched || label.length > BRIEF_LABEL_MAX)
      ? labelCheck.message
      : null;
  const gate = createGate(links);

  const onCreate = async () => {
    setLabelTouched(true);
    setCreateError(null);
    if (!labelCheck.ok) {
      labelRef.current?.focus();
      return; // invalid: no request is made
    }
    if (!gate.allowed) return;
    setCreating(true);
    try {
      const res = await callAction<{
        ok: true;
        link: { id: string; label: string };
        token: string;
      }>(briefLinkCreate, scopeId, {
        packId,
        label: labelCheck.label,
        expiresInDays: days,
      });
      setShown({
        url: briefLinkUrl(window.location.origin, res.token),
        label: res.link.label,
      });
      setCopied(false);
      setLabel("");
      setLabelTouched(false);
      setDays(BRIEF_DEFAULT_EXPIRY_DAYS);
      await queryClient.invalidateQueries({ queryKey });
      requestAnimationFrame(() => shownRef.current?.focus());
    } catch (e) {
      setCreateError(briefLinkErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!shown) return;
    try {
      await navigator.clipboard.writeText(shown.url);
      setCopied(true);
    } catch {
      // Clipboard not available: select the text so Ctrl/Cmd+C works.
      shownRef.current?.focus();
      shownRef.current?.select();
      setCopied(false);
    }
  };

  const dismiss = () => {
    setShown(null);
    setCopied(false);
    requestAnimationFrame(() => labelRef.current?.focus());
  };

  return (
    <section aria-labelledby="brief-links-title" data-testid="brief-links">
      <LcsCard title="Brief links">
        <div className="p-4 flex flex-col gap-4">
          <p
            id="brief-links-title"
            className="m-0 text-sm"
            style={{ color: "var(--lcs-ink-muted)" }}
          >
            Each link has a label and an expiry. You can change an expiry or
            revoke a link at any time.
          </p>

          {shown && (
            <div
              role="region"
              aria-label="New link"
              className="flex flex-col gap-2 p-3"
              style={{
                border: "1px solid var(--lcs-line)",
                background: "var(--lcs-white)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-lcs-ui)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--lcs-ink)",
                }}
              >
                Link created: {shown.label}
              </span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  ref={shownRef}
                  readOnly
                  aria-label="Your new link"
                  value={shown.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 outline-none"
                  style={packInputStyle(false)}
                  data-testid="brief-link-url"
                  autoComplete="off"
                  spellCheck={false}
                />
                <LcsButton variant="primary" onClick={() => void copy()}>
                  {copied ? "Copied" : "Copy"}
                </LcsButton>
              </div>
              <span role="status" style={small}>
                Copy this link now. For security it cannot be shown again.
              </span>
              <div>
                <LcsButton variant="secondary" onClick={dismiss}>
                  Done
                </LcsButton>
              </div>
            </div>
          )}

          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void onCreate();
            }}
            noValidate
          >
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-[1fr_12rem]">
              <PackField
                label="Label"
                required
                error={labelError}
                counter={labelCounter(label)}
                hint="Something that tells you who this link is for."
              >
                {(c) => (
                  <input
                    {...c}
                    ref={labelRef}
                    type="text"
                    name="brief-link-label"
                    autoComplete="off"
                    className="w-full outline-none"
                    style={packInputStyle(!!labelError)}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onBlur={() => setLabelTouched(true)}
                  />
                )}
              </PackField>
              <PackField label="Expires after">
                {(c) => (
                  <select
                    {...c}
                    name="brief-link-expiry"
                    className="w-full outline-none"
                    style={packInputStyle(false)}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  >
                    {BRIEF_EXPIRY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {expiryLabel(d)}
                      </option>
                    ))}
                  </select>
                )}
              </PackField>
            </div>
            {createError && (
              <div role="alert" className="text-sm p-3" style={alertBox}>
                {createError}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <LcsButton
                type="submit"
                variant="primary"
                disabled={creating || !gate.allowed}
              >
                {creating ? "Creating…" : "Create link"}
              </LcsButton>
              {!gate.allowed && (
                <span
                  role="status"
                  style={{ ...small, color: "var(--lcs-attention)" }}
                >
                  {gate.reason}
                </span>
              )}
            </div>
          </form>

          <div className="flex flex-col gap-3">
            {status === "pending" ? (
              <LcsSkeletonRows rows={2} columns={2} />
            ) : status === "error" ? (
              <div
                role="alert"
                className="text-sm p-3 flex flex-wrap items-center gap-3"
                style={alertBox}
              >
                <span>{briefLinkErrorMessage(loadError)}</span>
                <LcsButton variant="secondary" onClick={() => void refetch()}>
                  Try again
                </LcsButton>
              </div>
            ) : links.length === 0 ? (
              <LcsEmptyState
                title="No links yet"
                text="Create a link, give it a label and an expiry."
              />
            ) : (
              <ul
                className="m-0 p-0 list-none flex flex-col gap-3"
                aria-label="Brief links"
              >
                {links.map((l) => (
                  <LinkRow
                    key={l.id}
                    link={l}
                    links={links}
                    now={now}
                    scopeId={scopeId}
                    onChanged={() =>
                      queryClient.invalidateQueries({ queryKey })
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </LcsCard>
    </section>
  );
}

function LinkRow({
  link,
  links,
  now,
  scopeId,
  onChanged,
}: {
  link: BriefLink;
  links: BriefLink[];
  now: number;
  scopeId: string;
  onChanged: () => Promise<unknown> | void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [days, setDays] = useState<number>(BRIEF_DEFAULT_EXPIRY_DAYS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const rowRef = useRef<HTMLLIElement | null>(null);
  const revokeBtnRef = useRef<HTMLButtonElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const gate = expiryChangeGate(link, links);

  // Keyboard focus follows the two-step confirm: the confirm button takes focus when it appears, and the Revoke
  // button gets it back on Cancel.
  useEffect(() => {
    if (confirming) confirmBtnRef.current?.focus();
  }, [confirming]);

  const revoke = async () => {
    setError(null);
    setRevoking(true);
    try {
      await callAction(briefLinkRevoke, scopeId, { linkId: link.id });
      setConfirming(false);
      await onChanged();
      requestAnimationFrame(() => rowRef.current?.focus());
    } catch (e) {
      setError(briefLinkErrorMessage(e));
    } finally {
      setRevoking(false);
    }
  };

  const saveExpiry = async () => {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await callAction(briefLinkSetExpiry, scopeId, {
        linkId: link.id,
        expiresInDays: days,
      });
      setSaved(true);
      await onChanged();
    } catch (e) {
      setError(briefLinkErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const when =
    link.status === "revoked"
      ? `Revoked ${formatDate(link.revoked_at ?? link.created_at)}`
      : link.status === "expired"
        ? `Expired ${formatDate(link.expires_at)} · ${relativeTime(link.expires_at, now)}`
        : `Expires ${formatDate(link.expires_at)} · ${relativeTime(link.expires_at, now)}`;

  return (
    <li
      ref={rowRef}
      tabIndex={-1}
      aria-label={`Link ${link.label}, ${statusText(link.status)}`}
      className="flex flex-col gap-3 p-3 outline-none"
      style={{
        border: "1px solid var(--lcs-line)",
        background: "var(--lcs-white)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          style={{
            fontFamily: "var(--font-lcs-ui)",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--lcs-ink)",
            overflowWrap: "anywhere",
          }}
        >
          {link.label}
        </span>
        <LcsStatusPill
          status={STATUS_PILL[link.status]}
          label={statusText(link.status)}
        />
      </div>
      <div className="flex flex-col gap-0.5" style={small}>
        <span>
          Created {formatDate(link.created_at)} ·{" "}
          {relativeTime(link.created_at, now)}
        </span>
        <span>{when}</span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-end gap-2">
          <PackField label="Change expiry">
            {(c) => (
              <select
                {...c}
                aria-label={`Change expiry for ${link.label}`}
                className="outline-none"
                style={{ ...packInputStyle(false), minWidth: 120 }}
                value={days}
                disabled={!gate.allowed || saving}
                onChange={(e) => {
                  setDays(Number(e.target.value));
                  setSaved(false);
                }}
              >
                {BRIEF_EXPIRY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {expiryLabel(d)}
                  </option>
                ))}
              </select>
            )}
          </PackField>
          <LcsButton
            variant="secondary"
            aria-label={`Save expiry for ${link.label}`}
            disabled={!gate.allowed || saving}
            onClick={() => void saveExpiry()}
          >
            {saving ? "Saving…" : "Save"}
          </LcsButton>
        </div>

        {link.status !== "revoked" &&
          (confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm" style={{ color: "var(--lcs-ink)" }}>
                Revoke this link? This can't be undone.
              </span>
              <LcsButton
                ref={confirmBtnRef}
                variant="destructive"
                aria-label={`Confirm revoke ${link.label}`}
                disabled={revoking}
                onClick={() => void revoke()}
              >
                {revoking ? "Revoking…" : "Revoke link"}
              </LcsButton>
              <LcsButton
                variant="secondary"
                disabled={revoking}
                onClick={() => {
                  setConfirming(false);
                  requestAnimationFrame(() => revokeBtnRef.current?.focus());
                }}
              >
                Cancel
              </LcsButton>
            </div>
          ) : (
            <LcsButton
              ref={revokeBtnRef}
              variant="secondary"
              aria-label={`Revoke ${link.label}`}
              onClick={() => setConfirming(true)}
            >
              Revoke
            </LcsButton>
          ))}
      </div>

      {!gate.allowed && (
        <span role="status" style={small}>
          {gate.reason}
        </span>
      )}
      {saved && !error && (
        <span role="status" style={small}>
          Expiry updated.
        </span>
      )}
      {error && (
        <div role="alert" className="text-sm p-3" style={alertBox}>
          {error}
        </div>
      )}
    </li>
  );
}
