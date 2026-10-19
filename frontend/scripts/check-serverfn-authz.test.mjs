// Self-tests for the server-function guard (serverfn-guard-core.mjs): a failing and a passing example for each rule.
// Run by CI before the real guard, same as check-grants.test.mjs.
import { analyze } from "./serverfn-guard-core.mjs";

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) passed++;
  else {
    failed++;
    console.error("  ✗ " + name);
  }
}
const rules = (findings) =>
  findings
    .map((f) => f.rule)
    .sort()
    .join(",");
const entry = (
  file,
  name,
  policy,
  reason = "A written reason long enough to count.",
) => ({ file, name, policy, reason });

const SF = (body) =>
  `import { createServerFn } from "@tanstack/react-start";\nexport const fn = createServerFn({ method: "POST" }).handler(async ({ data }) => { ${body} });\n`;

// ── R2: email sender must be listed ────────────────────────────────────────────────────────────────
{
  const f = [
    { path: "src/lib/a.ts", text: SF("await sendEmail({ to: data.to });") },
  ];
  check("R2 fail: unlisted email sender", rules(analyze(f, [])) === "R2");
  const ok = [
    {
      path: "src/lib/a.ts",
      text: SF(
        "await requireUserIdentity(data.t); await sendEmail({ to: 'x' });",
      ),
    },
  ];
  check(
    "R2 pass: listed A with auth helper",
    analyze(ok, [entry("src/lib/a.ts", "fn", "A")]).length === 0,
  );
}

// ── R2: a helper in another file counts ────────────────────────────────────────────────────────────
{
  const f = [
    {
      path: "src/lib/a.ts",
      text: `import { go } from "./b";\n` + SF("await go(data);"),
    },
    {
      path: "src/lib/b.ts",
      text: `export async function go(d) { await sendEmailWith({}, d); }\n`,
    },
  ];
  check(
    "R2 fail: email sent from an imported helper",
    rules(analyze(f, [])) === "R2",
  );
  check(
    "R2 pass: same, listed with auth",
    analyze(
      [
        {
          ...f[0],
          text: f[0].text.replace(
            "await go(data);",
            "await requireUser(data.t); await go(data);",
          ),
        },
        f[1],
      ],
      [entry("src/lib/a.ts", "fn", "B")],
    ).length === 0,
  );
}

// ── R2: service client created in a helper (the original blind spot) ───────────────────────────────
{
  const f = [
    {
      path: "src/lib/a.ts",
      text:
        `function getServiceClient() { return createClient(url, SUPABASE_SERVICE_ROLE_KEY); }\n` +
        SF("const db = getServiceClient(); await db.from('t').select();"),
    },
  ];
  check(
    "R2 fail: service client in a helper, not listed",
    rules(analyze(f, [])) === "R2",
  );
  check(
    "R3 fail: listed G but no auth helper",
    rules(analyze(f, [entry("src/lib/a.ts", "*", "G")])) === "R3",
  );
  const ok = [
    {
      path: "src/lib/a.ts",
      text: f[0].text.replace(
        "const db",
        "await requireUser(data.t); const db",
      ),
    },
  ];
  check(
    "R2 pass: listed G with auth helper",
    analyze(ok, [entry("src/lib/a.ts", "*", "G")]).length === 0,
  );
  const lit = [
    {
      path: "src/lib/a.ts",
      text: SF("const k = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');"),
    },
  ];
  check(
    "R2 fail: the key name as a string literal counts",
    rules(analyze(lit, [])) === "R2",
  );
}

// ── R2: letter rules ───────────────────────────────────────────────────────────────────────────────
{
  const email = [
    {
      path: "src/lib/a.ts",
      text: SF("await requireUser(t); await sendEmail({});"),
    },
  ];
  check(
    "R2 fail: email sender listed as G",
    rules(analyze(email, [entry("src/lib/a.ts", "fn", "G")])) === "R2",
  );
  check(
    "R2 fail: email sender under a file wildcard",
    rules(analyze(email, [entry("src/lib/a.ts", "*", "G")])).includes("R2"),
  );
  const noParser = [
    {
      path: "src/lib/a.ts",
      text: SF("await upsertHubSpotContact(data.email, {});"),
    },
  ];
  check(
    "R2 fail: policy C without a strict parser",
    rules(analyze(noParser, [entry("src/lib/a.ts", "fn", "C")])) === "R2",
  );
  const parser = [
    {
      path: "src/lib/a.ts",
      text: SF(
        "const p = parseWaitlistInput(data); await upsertHubSpotContact('x', {});",
      ),
    },
  ];
  check(
    "R2 pass: policy C with a parse...Input function",
    analyze(parser, [entry("src/lib/a.ts", "fn", "C")]).length === 0,
  );
  const admin = [
    { path: "src/lib/a.ts", text: SF("await upsertHubSpotContact('x', {});") },
  ];
  check(
    "R2 fail: policy F without verifyAdminKey",
    rules(analyze(admin, [entry("src/lib/a.ts", "fn", "F")])) === "R2",
  );
  const adminOk = [
    {
      path: "src/lib/a.ts",
      text: SF(
        "if (!(await verifyAdminKey(k))) return; await upsertHubSpotContact('x', {});",
      ),
    },
  ];
  check(
    "R2 pass: policy F with verifyAdminKey",
    analyze(adminOk, [entry("src/lib/a.ts", "fn", "F")]).length === 0,
  );
  const hNo = [
    {
      path: "src/lib/a.ts",
      text: SF("const k = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');"),
    },
  ];
  check(
    "R2 fail: policy H without isUuid",
    rules(analyze(hNo, [entry("src/lib/a.ts", "fn", "H")])) === "R2",
  );
  const hOk = [
    {
      path: "src/lib/a.ts",
      text: SF(
        "if (!isUuid(data.t)) return; const k = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');",
      ),
    },
  ];
  check(
    "R2 pass: policy H with isUuid",
    analyze(hOk, [entry("src/lib/a.ts", "fn", "H")]).length === 0,
  );
}

// ── R2: allow-list hygiene ─────────────────────────────────────────────────────────────────────────
{
  const none = [{ path: "src/lib/a.ts", text: SF("return 1;") }];
  check(
    "R2 fail: stale allow-list entry",
    rules(analyze(none, [entry("src/lib/a.ts", "fn", "A")])) === "R2",
  );
  const f = [
    {
      path: "src/lib/a.ts",
      text: SF("await requireUser(t); await sendEmail({});"),
    },
  ];
  check(
    "R2 fail: unknown policy letter",
    analyze(f, [entry("src/lib/a.ts", "fn", "Z")]).some((x) =>
      /unknown policy/.test(x.message),
    ),
  );
  check(
    "R2 fail: no written reason",
    analyze(f, [entry("src/lib/a.ts", "fn", "A", "ok")]).some((x) =>
      /written reason/.test(x.message),
    ),
  );
}

// ── R4: log rule ───────────────────────────────────────────────────────────────────────────────────
const LOG = (line) => [
  {
    path: "src/lib/log.ts",
    text: `export function f(token, email, userEmail, apiKey, error, usage, headers) { ${line} }\n`,
  },
];
check(
  "R4 fail: logs a token",
  rules(analyze(LOG("console.log('x', token);"), [])) === "R4",
);
check(
  "R4 fail: logs an email inside a template",
  rules(analyze(LOG("console.error(`sent to ${userEmail}`);"), [])) === "R4",
);
check(
  "R4 fail: logs a key prefix",
  rules(analyze(LOG("console.log('p', apiKey.slice(0, 8));"), [])) === "R4",
);
check(
  "R4 fail: logs an authorization header",
  rules(analyze(LOG("console.log(headers.authorization);"), [])) === "R4",
);
check(
  "R4 pass: logs only an error object",
  analyze(LOG("console.error('failed:', error);"), []).length === 0,
);
check(
  "R4 pass: logs a presence boolean",
  analyze(LOG("console.log('key set:', !!apiKey);"), []).length === 0,
);
check(
  "R4 pass: logs a token count",
  analyze(LOG("console.log('used', usage.total_tokens);"), []).length === 0,
);
check(
  "R4 pass: a fixed message",
  analyze(LOG("console.log('[x] sent');"), []).length === 0,
);

// ── actions are out of scope (separate chokepoint) ─────────────────────────────────────────────────
check(
  "actions directory is not scanned by R2",
  analyze(
    [{ path: "src/lib/actions/a.ts", text: SF("await sendEmail({});") }],
    [],
  ).length === 0,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("✓ all self-tests passed");
