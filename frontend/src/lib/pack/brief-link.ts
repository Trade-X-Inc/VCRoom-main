// Pure helpers for the Brief links manager (no React, router or server imports; unit-tested in plain Node in
// tests/pack-brief-link.spec.ts). The rules mirror pack_api.brief_link_* (supabase/migrations/20261019090000_*):
// a label is 1 to 80 characters after trimming, an expiry is a whole number of days from 1 to 90, a pack holds at
// most 20 ACTIVE links. The server stays the authority; these only stop a request that cannot succeed.
import { ERROR_MESSAGES, friendlyError } from "@/lib/pack/pinned-schedule";

export const BRIEF_LABEL_MAX = 80;
export const BRIEF_ACTIVE_LIMIT = 20;
export const BRIEF_EXPIRY_OPTIONS = [1, 7, 14, 30, 60, 90] as const;
export const BRIEF_DEFAULT_EXPIRY_DAYS = 30;

export type BriefLinkStatus = "active" | "expired" | "revoked";
export type BriefLink = {
  id: string;
  label: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  status: BriefLinkStatus;
};

// The server trims space, tab, CR, LF, form feed and vertical tab (and nothing else), counts characters, and
// stores the trimmed text. JavaScript's trim() removes more kinds of whitespace, so trim the same set by hand.
const BLANK = /^[ \t\r\n\f\v]+|[ \t\r\n\f\v]+$/g;
export function trimLabel(text: string): string {
  return text.replace(BLANK, "");
}

export type LabelCheck =
  | { ok: true; label: string }
  | { ok: false; code: "invalid_label"; message: string };

export function checkLabel(text: string): LabelCheck {
  const label = trimLabel(text);
  const length = [...label].length;
  if (length < 1)
    return {
      ok: false,
      code: "invalid_label",
      message: "Enter a label so you can tell this link apart.",
    };
  if (length > BRIEF_LABEL_MAX)
    return {
      ok: false,
      code: "invalid_label",
      message: `The label must be ${BRIEF_LABEL_MAX} characters or fewer.`,
    };
  return { ok: true, label };
}

export function labelCounter(text: string): string {
  return `${[...trimLabel(text)].length} / ${BRIEF_LABEL_MAX}`;
}

export function isValidExpiryDays(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 90;
}

export function expiryLabel(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

export function statusText(status: BriefLinkStatus): string {
  return status === "active"
    ? "Active"
    : status === "expired"
      ? "Expired"
      : "Revoked";
}

export function activeCount(links: readonly BriefLink[]): number {
  return links.filter((l) => l.status === "active").length;
}

export type CreateGate = { allowed: boolean; reason: string | null };
export function createGate(links: readonly BriefLink[]): CreateGate {
  return activeCount(links) >= BRIEF_ACTIVE_LIMIT
    ? { allowed: false, reason: ERROR_MESSAGES.too_many_links }
    : { allowed: true, reason: null };
}

// A revoked link can never be changed. An expired (not revoked) link can get a new expiry, which brings it
// back to life; the server refuses that at 20 active links, so the screen shows that reason in advance.
export type ChangeGate = { allowed: boolean; reason: string | null };
export function expiryChangeGate(
  link: BriefLink,
  links: readonly BriefLink[],
): ChangeGate {
  if (link.status === "revoked")
    return {
      allowed: false,
      reason: "This link is revoked, so its expiry can't be changed.",
    };
  if (link.status === "expired" && activeCount(links) >= BRIEF_ACTIVE_LIMIT)
    return { allowed: false, reason: ERROR_MESSAGES.too_many_links };
  return { allowed: true, reason: null };
}

export function sortNewestFirst(links: readonly BriefLink[]): BriefLink[] {
  return [...links].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );
}

// The address a founder hands out. Only ever built from the one response that carries the token.
export function briefLinkUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/b/${token}`;
}

// "3 days ago" / "in 2 days" / "just now". `now` is a parameter so the result is testable.
export function relativeTime(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = t - now;
  const abs = Math.abs(diff);
  const unit =
    abs < 60_000
      ? null
      : abs < 3_600_000
        ? [Math.round(abs / 60_000), "minute"]
        : abs < 86_400_000
          ? [Math.round(abs / 3_600_000), "hour"]
          : [Math.round(abs / 86_400_000), "day"];
  if (!unit) return "just now";
  const text = `${unit[0]} ${unit[1]}${unit[0] === 1 ? "" : "s"}`;
  return diff < 0 ? `${text} ago` : `in ${text}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// A link token is 43 characters of base64url. Anything that looks like one (or longer) is replaced, so a message
// that was built from a response or a URL can be logged or shown without carrying the token.
const TOKEN_LIKE = /[A-Za-z0-9_-]{43,}/g;
export function maskTokens(text: string): string {
  return text.replace(TOKEN_LIKE, "[link hidden]");
}

// The flag that shows the Brief links section: on only when it is exactly the string "true".
export function briefLinksEnabled(raw: unknown): boolean {
  return raw === "true";
}

// The sentence shown for a failed Brief link call. A missing link and a link on someone else's pack look the same
// to the server (not_found), so the sentence says "link or pack"; every other code uses the shared messages.
export function briefLinkErrorMessage(e: unknown): string {
  const code = e instanceof Error ? e.message : "";
  if (code === "not_found") return "That link or pack could not be found.";
  return friendlyError(e);
}
