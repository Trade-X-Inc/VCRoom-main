// Lengdon email kit: one renderer for every email (app emails sent through Resend and the Supabase Auth
// templates pasted in the dashboard). Pure: no imports, no I/O.
//
// An email is a small MODEL (subject, preheader, heading, blocks, footer reason). The renderer turns that model
// into table-based HTML with inline CSS (Outlook-safe) and into a plain-text part, so the two always agree.
//
// Safety rules enforced here, not left to callers:
//   * every value is HTML-escaped; single-line values also lose control characters and are length-capped;
//   * a value written by a user can never become a link: URL-looking text is defanged, and the only clickable
//     URLs are the ones the renderer builds, which must start with our own base URL ("app" mode) or be a Supabase
//     placeholder such as {{ .ConfirmationURL }} ("supabase" mode);
//   * no remote images, fonts or tracking pixels, no scripts; light colour scheme only.
//
// Design source: DESIGN.md (Design Constitution v2) tokens. Accent #1B3A63, surface #F5F4F1, ink #16181C.

export const EMAIL_COLORS = {
  surface: "#F5F4F1",
  panel: "#FFFFFF",
  ink: "#16181C",
  inkSecondary: "#464C58",
  inkMuted: "#6E7585",
  rule: "#D6D4CD",
  accent: "#1B3A63",
  accentWash: "#E8EDF4",
  onAccent: "#FFFFFF",
} as const;

const UI_FONT = "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF_FONT = "'Source Serif 4', Georgia, 'Times New Roman', serif";
const MONO_FONT = "'JetBrains Mono', 'Courier New', Courier, monospace";

/** Footer line the owner must supply (postal address / legal entity). Not invented here; see the E1 report. */
export const OWNER_FOOTER_PLACEHOLDER =
  "OWNER PLACEHOLDER (E1): postal address and legal entity line for the email footer. Not provided; do not invent.";

export type Block =
  | { t: "p"; text: string }
  | { t: "list"; items: string[] }
  | { t: "facts"; rows: [label: string, value: string][] }
  | { t: "note"; label: string; text: string } // labelled callout: the label carries the meaning, not the colour
  | { t: "message"; label: string; text: string } // a person's own multi-line message, shown as a quotation
  | { t: "code"; text: string } // a short code to type
  | { t: "button"; label: string; url: string }
  | { t: "fine"; text: string }; // small print

export type EmailModel = {
  subject: string;
  /** Hidden inbox preview text. */
  preheader: string;
  heading: string;
  blocks: Block[];
  /** Why the person received this email (footer). */
  reason: string;
};

export type RenderOptions =
  { mode: "app"; appUrl: string } | { mode: "supabase" };

export type RenderedEmail = { subject: string; html: string; text: string };

// ── escaping and cleaning ────────────────────────────────────────────────────────────────────────────

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ZWSP = "​";

/**
 * Stop mail clients from turning user-written text into a link: break "http://", "https://" and "www." with a
 * zero-width space. The text stays readable and copyable but is not auto-linked by Gmail or Apple Mail.
 */
export function defang(value: string): string {
  return value
    .replace(
      /\b(https?|ftp):\/\//gi,
      (_m, scheme: string) => `${scheme}:${ZWSP}//`,
    )
    .replace(/\bwww\./gi, `www${ZWSP}.`)
    .replace(
      /\b(javascript|data|vbscript):/gi,
      (_m, scheme: string) => `${scheme}${ZWSP}:`,
    );
}

/** One line: control characters and line breaks become spaces, runs collapse, length is capped. */
export function cleanLine(value: unknown, max = 200): string {
  const s = String(value ?? "")
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

// Anything that reads as a link or an address: a scheme, "://", "www.", an at-sign, a dot followed by a letters-only
// suffix (a domain), an IP-like run, or a spelled-out "dot com". Checked on the NFKC-normalised, zero-width-stripped
// value so full-width dots and hidden characters cannot hide one.
const LINKISH =
  /(?:https?|ftp|file|data|javascript|vbscript|mailto):|:\/\/|\bwww\.|@|[\p{L}\p{N}]\.\p{L}{2,}|\d+\.\d+\.\d+|\(dot\)|\[dot\]|\bdot\s+(?:com|net|org|io|co|app|dev|xyz|info)\b/iu;

/**
 * A person's or company's name placed in an email subject or body (J3a-fix). One line, control and format characters
 * (zero-width, bidi) removed, whitespace collapsed, capped at `max`. Returns null when the value is empty or contains
 * anything that looks like a link or an address, or that contains the word "lengdon"; the caller then uses a neutral fallback instead of a half-cleaned value.
 */
export function safeDisplayName(value: unknown, max = 60): string | null {
  const s = String(value ?? "")
    .normalize("NFKC")
    // full stops NFKC leaves alone (ideographic, half-width ideographic, one-dot leader, small full stop)
    .replace(/[\u3002\uFF61\u2024\uFE52]/g, ".")
    .replace(/[\p{Cc}\u2028\u2029]/gu, " ")
    .replace(/\p{Cf}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  // The brand word is never accepted from a user: a name containing it could pass for a message from us.
  if (!s || LINKISH.test(s) || /lengdon/i.test(s)) return null;
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

/** The token the database issues: 32 random bytes as base64url without padding, exactly 43 characters. */
export const INVITE_TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/** Several lines (a personal message): line breaks kept, other control characters dropped, blank runs capped. */
export function cleanMultiline(value: unknown, max = 1000): string {
  const s = String(value ?? "")
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f\u2028\u2029]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

// Text placed in HTML: user-controlled values are defanged then escaped. Supabase placeholders pass through
// because their braces and dots are not touched by escaping.
const h = (value: string) => escapeHtml(defang(value));
const hMulti = (value: string) => h(value).replace(/\n/g, "<br>");

// ── URLs ─────────────────────────────────────────────────────────────────────────────────────────────

const PLACEHOLDER_URL = /^\{\{ \.(ConfirmationURL|SiteURL) \}\}$/;
const SAFE_URL_CHARS = /^[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;

/** A link may only be our own site (plus an id or token we generated) or a documented Supabase placeholder. */
export function assertOwnUrl(url: string, opts: RenderOptions): string {
  if (opts.mode === "supabase") {
    if (PLACEHOLDER_URL.test(url)) return url;
    if (/^https:\/\/lengdon\.com(\/[A-Za-z0-9\-._~/]*)?$/.test(url)) return url;
    throw new Error(
      "email link is not a Supabase placeholder or a lengdon.com address",
    );
  }
  const base = opts.appUrl.replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(base))
    throw new Error("appUrl must be an https origin");
  if (!url.startsWith(base + "/") && url !== base)
    throw new Error("email link must start with our own site address");
  if (!SAFE_URL_CHARS.test(url))
    throw new Error("email link contains unsafe characters");
  return url;
}

/** An identifier or token we generated (uuid or similar): letters, digits, dash, underscore only. */
export function safeId(value: string): string {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(value))
    throw new Error("unsafe identifier in email link");
  return value;
}

/** "27 Oct 2026" in UTC, or "" when the value is not a date. */
export function formatDateUtc(iso: unknown): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ── HTML ─────────────────────────────────────────────────────────────────────────────────────────────

const C = EMAIL_COLORS;
const P_STYLE = `margin:0 0 16px 0;font-family:${UI_FONT};font-size:16px;line-height:24px;color:${C.ink};`;
const FINE_STYLE = `margin:0 0 12px 0;font-family:${UI_FONT};font-size:14px;line-height:21px;color:${C.inkSecondary};`;

function renderBlockHtml(b: Block, opts: RenderOptions): string {
  switch (b.t) {
    case "p":
      return `<p style="${P_STYLE}">${h(b.text)}</p>`;
    case "list":
      return `<ul style="margin:0 0 16px 0;padding:0 0 0 22px;font-family:${UI_FONT};font-size:16px;line-height:24px;color:${C.ink};">${b.items
        .map((i) => `<li style="margin:0 0 6px 0;">${h(i)}</li>`)
        .join("")}</ul>`;
    case "facts":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;border-top:1px solid ${C.rule};">${b.rows
        .map(
          ([l, v]) =>
            `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid ${C.rule};font-family:${UI_FONT};font-size:14px;line-height:20px;color:${C.inkSecondary};width:35%;vertical-align:top;">${h(l)}</td><td style="padding:10px 0;border-bottom:1px solid ${C.rule};font-family:${UI_FONT};font-size:16px;line-height:22px;color:${C.ink};vertical-align:top;">${h(v)}</td></tr>`,
        )
        .join("")}</table>`;
    case "note":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;"><tr><td bgcolor="${C.accentWash}" style="background-color:${C.accentWash};border-left:3px solid ${C.accent};padding:12px 16px;font-family:${UI_FONT};font-size:15px;line-height:22px;color:${C.ink};"><strong>${h(b.label)}.</strong> ${h(b.text)}</td></tr></table>`;
    case "message":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;"><tr><td style="border-left:3px solid ${C.rule};padding:4px 0 4px 16px;font-family:${UI_FONT};font-size:16px;line-height:24px;color:${C.ink};"><span style="display:block;font-size:13px;line-height:20px;color:${C.inkSecondary};">${h(b.label)}</span>${hMulti(b.text)}</td></tr></table>`;
    case "code":
      return `<p style="margin:0 0 16px 0;font-family:${MONO_FONT};font-size:28px;line-height:36px;letter-spacing:4px;color:${C.accent};font-weight:bold;">${h(b.text)}</p>`;
    case "button": {
      const url = assertOwnUrl(b.url, opts);
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px 0;"><tr>` +
        `<td bgcolor="${C.accent}" style="background-color:${C.accent};border-radius:2px;mso-padding-alt:14px 24px;">` +
        `<a href="${url}" style="display:inline-block;padding:14px 24px;font-family:${UI_FONT};font-size:16px;line-height:16px;font-weight:bold;color:${C.onAccent};text-decoration:none;">${h(b.label)}</a>` +
        `</td></tr></table>` +
        `<p style="${FINE_STYLE}">Or copy this link into your browser:<br><a href="${url}" style="color:${C.accent};text-decoration:underline;word-break:break-all;">${url}</a></p>`
      );
    }
    case "fine":
      return `<p style="${FINE_STYLE}">${h(b.text)}</p>`;
  }
}

export function renderHtml(m: EmailModel, opts: RenderOptions): string {
  const body = m.blocks.map((b) => renderBlockHtml(b, opts)).join("\n");
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${h(m.subject)}</title>
<style>:root{color-scheme:light only;supported-color-schemes:light;}</style>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${C.surface};color:${C.ink};color-scheme:light;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.surface};">${h(m.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.surface}" style="background-color:${C.surface};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}" style="width:100%;max-width:600px;background-color:${C.panel};border:1px solid ${C.rule};">
<tr><td style="padding:20px 32px 16px 32px;border-bottom:2px solid ${C.accent};font-family:${SERIF_FONT};font-size:26px;line-height:30px;font-weight:bold;color:${C.accent};">Lengdon</td></tr>
<tr><td style="padding:28px 32px 16px 32px;">
<h1 style="margin:0 0 20px 0;font-family:${UI_FONT};font-size:24px;line-height:30px;font-weight:bold;color:${C.ink};">${h(m.heading)}</h1>
${body}
</td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="padding:16px 32px 8px 32px;font-family:${UI_FONT};font-size:13px;line-height:20px;color:${C.inkSecondary};">
<strong style="color:${C.ink};">Lengdon</strong><br>
${h(m.reason)}<br>
Lengdon will never ask for your password by email.<br>
Questions? Reply to this email.
<!-- ${OWNER_FOOTER_PLACEHOLDER} -->
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── plain text ───────────────────────────────────────────────────────────────────────────────────────

function renderBlockText(b: Block, opts: RenderOptions): string {
  switch (b.t) {
    case "p":
    case "fine":
      return defang(b.text);
    case "list":
      return b.items.map((i) => `- ${defang(i)}`).join("\n");
    case "facts":
      return b.rows.map(([l, v]) => `${defang(l)}: ${defang(v)}`).join("\n");
    case "note":
      return `${defang(b.label)}. ${defang(b.text)}`;
    case "message":
      return `${defang(b.label)}:\n${defang(b.text)
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n")}`;
    case "code":
      return b.text;
    case "button":
      return `${defang(b.label)}:\n${assertOwnUrl(b.url, opts)}`;
  }
}

export function renderText(m: EmailModel, opts: RenderOptions): string {
  return [
    defang(m.heading),
    "",
    m.blocks.map((b) => renderBlockText(b, opts)).join("\n\n"),
    "",
    "--",
    "Lengdon",
    defang(m.reason),
    "Lengdon will never ask for your password by email.",
    "Questions? Reply to this email.",
  ].join("\n");
}

export function renderEmail(m: EmailModel, opts: RenderOptions): RenderedEmail {
  return {
    subject: cleanLine(m.subject, 150),
    html: renderHtml(m, opts),
    text: renderText(m, opts),
  };
}

// ── colour contrast (used by the tests) ──────────────────────────────────────────────────────────────

export function contrastRatio(fg: string, bg: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.replace("#", ""), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}
