// Pure tests for the Lengdon email kit, the app templates and the Supabase Auth templates. No browser, no network,
// nothing is sent. See CLAUDE.md §20.27.
import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "fs";
import {
  EMAIL_COLORS as C,
  assertOwnUrl,
  cleanLine,
  contrastRatio,
  defang,
  escapeHtml,
  renderEmail,
  safeId,
  type EmailModel,
} from "../src/lib/email/kit";
import {
  dealRoomInviteEmail,
  documentUploadedEmail,
  lawyerInviteEmail,
  ndaSignedEmail,
  startupTeamInviteEmail,
  welcomeEmail,
} from "../src/lib/email/templates";
import {
  ALLOWED_VARIABLES,
  SUPABASE_TEMPLATES,
  renderSupabaseTemplate,
} from "../src/lib/email/supabase-templates";
import {
  APP_SAMPLES,
  SAMPLE_APP_URL,
  SAMPLE_ROOM,
  SAMPLE_TOKEN,
} from "../src/lib/email/email-samples";

const BASE = SAMPLE_APP_URL;
const ROOT = new URL("../../", import.meta.url);

const HOSTILE = [
  "<script>alert(1)</script>",
  '"><img src=x onerror=alert(1)>',
  "' onmouseover='alert(1)",
  "Line one\r\nBcc: attacker@example.invalid\nLine three",
  "https://evil.example/phish and http://evil.example and www.evil.example and javascript:alert(1)",
  "A".repeat(20000),
  '<a href="https://evil.example">click</a>',
  "&lt;already escaped&gt; & ampersand",
];

function hostileMails(v: string) {
  return [
    welcomeEmail({ name: v, role: "founder", appUrl: BASE }),
    welcomeEmail({ name: v, role: "investor", appUrl: BASE }),
    dealRoomInviteEmail({
      founderName: v,
      companyName: v,
      token: SAMPLE_TOKEN,
      message: v,
      expiresAt: v,
      appUrl: BASE,
    }),
    ndaSignedEmail({
      investorName: v,
      investorEmail: v,
      companyName: v,
      roomId: SAMPLE_ROOM,
      appUrl: BASE,
    }),
    documentUploadedEmail({
      uploaderName: v,
      companyName: v,
      documentName: v,
      roomId: SAMPLE_ROOM,
      appUrl: BASE,
    }),
    startupTeamInviteEmail({
      inviterName: v,
      companyName: v,
      role: v,
      token: SAMPLE_TOKEN,
      expiresAt: v,
      appUrl: BASE,
    }),
    lawyerInviteEmail({
      inviterName: v,
      companyName: v,
      side: "founder",
      token: SAMPLE_TOKEN,
      expiresAt: v,
      appUrl: BASE,
    }),
  ];
}

const hrefs = (html: string) =>
  [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
const urlsIn = (s: string) =>
  [...s.matchAll(/https?:\/\/[^\s"'<>]*/g)].map((m) => m[0]);

test.describe("escaping and link safety", () => {
  for (const [i, v] of HOSTILE.entries()) {
    test(`hostile input #${i} is escaped in every app email and cannot create a link`, () => {
      for (const mail of hostileMails(v)) {
        const { html, text, subject } = mail;
        expect(html).not.toMatch(/<script/i);
        expect(html).not.toMatch(/<img/i);
        expect(html).not.toMatch(
          /<iframe|<object|<embed|<form|<style[^>]*>[^<]*expression/i,
        );
        expect(html).not.toContain('<a href="https://evil');
        // the only clickable destinations are ours
        for (const h of hrefs(html))
          expect(h.startsWith(BASE + "/") || h === BASE, `href ${h}`).toBe(
            true,
          );
        // every absolute URL left in the document is ours (user URLs are defanged with a zero-width space)
        for (const u of urlsIn(html))
          expect(u.startsWith(BASE), `url ${u}`).toBe(true);
        for (const u of urlsIn(text))
          expect(u.startsWith(BASE), `text url ${u}`).toBe(true);
        // size stays far under Gmail's clipping limit even for 20,000-character input
        expect(Buffer.byteLength(html)).toBeLessThan(30_000);
        // a subject is one clean line
        expect(subject).not.toMatch(/[\r\n]/);
        expect(subject.length).toBeLessThanOrEqual(150);
        // no raw line break can reach an attribute: attributes are built only from our own values
        for (const attr of html.match(/="[^"]*"/g) ?? [])
          expect(attr).not.toMatch(/[\r\n]/);
      }
    });
  }

  test("angle brackets and quotes from users appear escaped, not raw", () => {
    const { html } = ndaSignedEmail({
      investorName: '<b>"Sam"</b>',
      investorEmail: "sam@example.com",
      companyName: "Acme <script>",
      roomId: SAMPLE_ROOM,
      appUrl: BASE,
    });
    expect(html).toContain("&lt;b&gt;&quot;Sam&quot;&lt;/b&gt;");
    expect(html).toContain("Acme &lt;script&gt;");
    expect(html).not.toContain("<b>");
  });

  test("a personal message keeps its line breaks and cannot add markup", () => {
    const { html, text } = dealRoomInviteEmail({
      founderName: "Alex",
      companyName: "Acme",
      token: SAMPLE_TOKEN,
      message: "Hi<br><a href=//evil.example>x</a>\nSecond line",
      appUrl: BASE,
    });
    expect(html).toContain(
      "Hi&lt;br&gt;&lt;a href=//evil.example&gt;x&lt;/a&gt;<br>Second line",
    );
    expect(text).toContain("> Second line");
  });

  test("links are built only from our base plus an identifier or token we generated", () => {
    expect(() => safeId("../../etc/passwd")).toThrow();
    expect(() => safeId('abc"onclick="x')).toThrow();
    expect(() => safeId("abc def ghi jkl")).toThrow();
    expect(safeId(SAMPLE_TOKEN)).toBe(SAMPLE_TOKEN);
    for (const bad of [
      "x/../y",
      'x"y',
      "a b c d e f g h",
      "//evil.example/aaaaaaaa",
      "https://evil.example/aaaaaaaa",
    ]) {
      expect(() =>
        ndaSignedEmail({
          investorName: "a",
          investorEmail: "a@b.co",
          companyName: "c",
          roomId: bad,
          appUrl: BASE,
        }),
      ).toThrow();
    }
    expect(() =>
      dealRoomInviteEmail({
        founderName: "a",
        companyName: "c",
        token: "x y",
        appUrl: BASE,
      }),
    ).toThrow();
    // an attacker-chosen base address is refused too
    expect(() =>
      welcomeEmail({
        name: "a",
        role: "founder",
        appUrl: "http://evil.example",
      }),
    ).toThrow();
    expect(() =>
      assertOwnUrl("https://evil.example/x", { mode: "app", appUrl: BASE }),
    ).toThrow();
    expect(() =>
      assertOwnUrl(BASE + '/x"onclick="y', { mode: "app", appUrl: BASE }),
    ).toThrow();
    expect(() => assertOwnUrl("{{ .Data }}", { mode: "supabase" })).toThrow();
  });

  test("helpers: escape, clean, defang", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
    expect(cleanLine("a\r\nb\tc\u0000d   e")).toBe("a b c d e");
    expect(cleanLine("x".repeat(500), 50).length).toBe(50);
    expect(defang("see https://x.example and www.y.example")).not.toMatch(
      /https:\/\/|www\./,
    );
  });
});

test.describe("every app email", () => {
  test("has a plain-text part with the full link, the security line and no markup", () => {
    for (const s of APP_SAMPLES) {
      const { text, html } = s.mail;
      expect(text.length, s.id).toBeGreaterThan(80);
      expect(text, s.id).not.toMatch(/<[a-z!/]/i);
      expect(text, s.id).toContain(
        "Lengdon will never ask for your password by email.",
      );
      const link = hrefs(html).find((h) => h.startsWith(BASE + "/"));
      expect(link, s.id).toBeTruthy();
      expect(text, s.id).toContain(link as string);
      expect(html, s.id).toContain(`>${link}</a>`); // the full link is printed below the button
    }
  });

  test("subjects are plain, specific, brand-named, with no emoji, shouting or exclamation marks", () => {
    for (const s of APP_SAMPLES) {
      const sub = s.mail.subject;
      expect(sub, s.id).toContain("Lengdon");
      expect(sub, s.id).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(sub, s.id).not.toMatch(/!/);
      expect(sub, s.id).not.toMatch(/\b[A-Z]{4,}\b/);
      expect(sub, s.id).not.toMatch(
        /\b(free|winner|urgent|act now|limited time)\b/i,
      );
    }
    expect(
      welcomeEmail({ name: "x", role: "founder", appUrl: BASE }).subject,
    ).toBe("Welcome to Lengdon");
  });

  test("invite emails state the real expiry date from the record, or nothing", () => {
    const withDate = startupTeamInviteEmail({
      inviterName: "a",
      companyName: "c",
      role: "admin",
      token: SAMPLE_TOKEN,
      expiresAt: "2026-10-27T10:00:00Z",
      appUrl: BASE,
    });
    expect(withDate.html).toContain("expires on 27 Oct 2026 (UTC)");
    const none = startupTeamInviteEmail({
      inviterName: "a",
      companyName: "c",
      role: "admin",
      token: SAMPLE_TOKEN,
      appUrl: BASE,
    });
    expect(none.html).not.toMatch(/expires/i);
    expect(withDate.html + none.html).not.toMatch(
      /\b\d+\s*(minutes?|hours?|days?)\b/i,
    ); // no invented durations
  });

  test("no invented claims: statistics, prices, discounts or AI promises", () => {
    for (const s of APP_SAMPLES) {
      expect(s.mail.text, s.id).not.toMatch(
        /\d+\s?%|\b50% off\b|extra AI|AI-powered|free during beta|completely free|3x|3×/i,
      );
    }
  });
});

test.describe("design and accessibility rules for every email (app and Supabase)", () => {
  const all = [
    ...APP_SAMPLES.map((s) => ({ id: "app:" + s.id, html: s.mail.html })),
    ...SUPABASE_TEMPLATES.map((t) => ({
      id: "supabase:" + t.id,
      html: renderSupabaseTemplate(t),
    })),
  ];

  test("structure: lang, one h1, presentation tables, light only, 600 px, no images or remote assets", () => {
    for (const e of all) {
      expect(e.html, e.id).toMatch(/<html lang="en"/);
      expect((e.html.match(/<h1\b/g) ?? []).length, e.id).toBe(1);
      for (const tag of e.html.match(/<table\b[^>]*>/g) ?? [])
        expect(tag, e.id).toContain('role="presentation"');
      expect(e.html, e.id).toContain(
        '<meta name="color-scheme" content="light only">',
      );
      expect(e.html, e.id).toContain(
        '<meta name="supported-color-schemes" content="light">',
      );
      expect(e.html, e.id).not.toMatch(/prefers-color-scheme/);
      expect(e.html, e.id).toContain("max-width:600px");
      expect(e.html, e.id).not.toMatch(
        /<img|<link\b|<script|<iframe|<video|<audio|<svg|url\(|@import|background-image|src=/i,
      );
      expect(e.html, e.id).not.toMatch(/#7c3aed|#7C3AED|Syne|hs-gradient/);
      expect(e.html, e.id).not.toContain(C.inkMuted); // muted grey is too faint for small text on the surface
      for (const h of hrefs(e.html)) {
        expect(
          /^(https:\/\/lengdon\.com(\/|$)|\{\{ \.(ConfirmationURL|SiteURL) \}\})/.test(
            h,
          ),
          `${e.id} href ${h}`,
        ).toBe(true);
      }
      for (const u of urlsIn(e.html))
        expect(u.startsWith("https://lengdon.com"), `${e.id} url ${u}`).toBe(
          true,
        );
    }
  });

  test("buttons are bulletproof: padding on the link, 44 px high, with the full link printed below", () => {
    for (const e of all) {
      if (
        !e.html.includes("background-color:" + C.accent + ";border-radius:2px")
      )
        continue; // code-only email
      expect(e.html, e.id).toContain("padding:14px 24px");
      expect(e.html, e.id).toContain("line-height:16px"); // 14 + 16 + 14 = 44
      expect(e.html, e.id).toContain("mso-padding-alt:14px 24px");
      expect(e.html, e.id).toContain("Or copy this link into your browser");
    }
  });

  test("text and button colour pairs meet 4.5:1", () => {
    const pairs: [string, string, string][] = [
      ["ink on panel", C.ink, C.panel],
      ["secondary on panel", C.inkSecondary, C.panel],
      ["secondary on surface (footer)", C.inkSecondary, C.surface],
      ["ink on surface", C.ink, C.surface],
      ["accent link on panel", C.accent, C.panel],
      ["button text on accent", C.onAccent, C.accent],
      ["ink on callout wash", C.ink, C.accentWash],
      ["accent on callout wash", C.accent, C.accentWash],
    ];
    for (const [label, fg, bg] of pairs)
      expect(contrastRatio(fg, bg), label).toBeGreaterThanOrEqual(4.5);
  });

  test("footer: who we are, why you got this, the password line, and the owner placeholder (no invented address)", () => {
    for (const e of all) {
      expect(e.html, e.id).toContain(
        "Lengdon will never ask for your password by email.",
      );
      expect(e.html, e.id).toMatch(
        /You received this email because|was sent to this address|invited this address/,
      );
      expect(e.html, e.id).toContain("OWNER PLACEHOLDER (E1)");
    }
  });

  test("every email is far below Gmail's 102 KB clipping limit", () => {
    for (const e of all)
      expect(Buffer.byteLength(e.html), e.id).toBeLessThan(15_000);
  });

  test("no emoji and no exclamation marks anywhere", () => {
    for (const e of all) {
      expect(e.html, e.id).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(e.html.replace(/<!--[\s\S]*?-->/g, ""), e.id).not.toMatch(
        /!(?!DOCTYPE)/,
      );
    }
  });
});

test.describe("Supabase templates", () => {
  test("only documented variables for each template, and nothing user-written ({{ .Data }})", () => {
    for (const t of SUPABASE_TEMPLATES) {
      const html = renderSupabaseTemplate(t);
      const used = [...html.matchAll(/\{\{\s*\.(\w+)\s*\}\}/g)].map(
        (m) => m[1],
      );
      for (const v of used)
        expect(ALLOWED_VARIABLES[t.id], `${t.id} uses {{ .${v} }}`).toContain(
          v,
        );
      expect(used, t.id).not.toContain("Data");
      expect(html.replace(/\{\{\s*\.\w+\s*\}\}/g, ""), t.id).not.toMatch(
        /\{\{|\}\}/,
      );
    }
    expect(SUPABASE_TEMPLATES.length).toBe(13);
  });

  test('expiry text: reset password and magic link say "15 minutes"; no other duration appears anywhere', () => {
    for (const t of SUPABASE_TEMPLATES) {
      const html = renderSupabaseTemplate(t);
      const durations =
        html.match(/\b\d+\s*(seconds?|minutes?|hours?|days?)\b/gi) ?? [];
      if (t.expiryMinutes === 15) {
        expect(html, t.id).toContain("This link expires in 15 minutes");
        expect(
          durations.every((d) => /^15 minutes$/i.test(d)),
          t.id,
        ).toBe(true);
      } else {
        expect(durations, t.id).toEqual([]);
      }
    }
    expect(
      SUPABASE_TEMPLATES.filter((t) => t.expiryMinutes)
        .map((t) => t.id)
        .sort(),
    ).toEqual(["magic_link", "reset_password"]);
  });

  test("security wording: says who it is about, and that nothing changes until the link is used", () => {
    for (const id of [
      "confirm_signup",
      "magic_link",
      "reset_password",
      "change_email",
      "invite_user",
    ]) {
      const t = SUPABASE_TEMPLATES.find((x) => x.id === id)!;
      const html = renderSupabaseTemplate(t);
      expect(html, id).toMatch(
        /nothing changes until the (link|code) is used|stays as it is until the link is used|no account is active until/,
      );
      expect(html, id).toMatch(/\{\{ \.Email \}\}/);
    }
    for (const id of [
      "password_changed",
      "email_changed",
      "phone_changed",
      "identity_linked",
      "identity_removed",
      "mfa_added",
      "mfa_removed",
    ]) {
      const html = renderSupabaseTemplate(
        SUPABASE_TEMPLATES.find((x) => x.id === id)!,
      );
      expect(html, id).toContain("If this was not you");
      expect(html, id).toContain("hello@lengdon.com");
    }
  });

  test("subjects are plain and the committed files are exactly what the script renders", () => {
    const dir = new URL("supabase/email-templates/", ROOT);
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".html"))
      .sort();
    expect(files).toEqual(SUPABASE_TEMPLATES.map((t) => t.file).sort());
    for (const t of SUPABASE_TEMPLATES) {
      expect(
        readFileSync(new URL(t.file, dir), "utf8"),
        `${t.file} is out of date: run node frontend/scripts/build-email-assets.mjs supabase`,
      ).toBe(renderSupabaseTemplate(t));
      expect(t.model.subject).not.toMatch(
        /\p{Extended_Pictographic}|!|\b[A-Z]{4,}\b/u,
      );
      expect(t.model.subject).toContain("Lengdon");
    }
    const readme = readFileSync(new URL("README.md", dir), "utf8");
    for (const t of SUPABASE_TEMPLATES)
      expect(readme).toContain(t.model.subject);
  });
});

test("brand guard: no VentureRoom or Hockystick text in any email template, kit, sample or Supabase file", () => {
  const files = [
    ...[
      "kit.ts",
      "templates.ts",
      "supabase-templates.ts",
      "email-samples.ts",
      "handlers.ts",
      "resend.ts",
    ].map((f) => new URL("../src/lib/email/" + f, import.meta.url)),
    ...readdirSync(new URL("supabase/email-templates/", ROOT)).map(
      (f) => new URL("supabase/email-templates/" + f, ROOT),
    ),
  ];
  for (const f of files)
    expect(readFileSync(f, "utf8"), f.pathname).not.toMatch(
      /venture\s?room|hockystick/i,
    );
});

test("a model with a hostile heading still renders escaped (kit level)", () => {
  const m: EmailModel = {
    subject: "<b>x</b>\nBcc: a@b.co",
    preheader: "<i>",
    heading: "<u>h</u>",
    blocks: [{ t: "p", text: "<s>p</s>" }],
    reason: "<r>",
  };
  const r = renderEmail(m, { mode: "app", appUrl: BASE });
  expect(r.html).not.toMatch(/<b>|<i>|<u>|<s>|<r>/);
  expect(r.subject).not.toMatch(/\n/);
});
