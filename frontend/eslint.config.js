import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",

      // ── Swallowed Supabase errors ─────────────────────────────────────
      // Two silent production outages (notifications.kind CHECK, account
      // deletion no-op) came from Supabase writes whose errors were
      // discarded. These selectors flag the exact patterns:
      //
      //  1-3. .catch(() => null) / .catch(() => undefined) / .catch(() => {})
      //       anywhere on a supabase .from(...) chain — suppressing instead
      //       of logging.
      //  4-5. `await supabase.from(...).insert/update/upsert/delete(...)`
      //       (or fire-and-forget without await) used as a bare statement —
      //       the { error } result is discarded, so failures are invisible.
      //
      // Fix pattern: destructure `const { error } = await ...` and handle
      // it, or at minimum log it (see lib/notify.ts).
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='catch'][arguments.0.body.type='Literal'] CallExpression[callee.property.name='from']",
          message:
            "Swallowed Supabase error: .catch(() => null) hides failures. Destructure { error } and handle/log it (see lib/notify.ts).",
        },
        {
          selector:
            "CallExpression[callee.property.name='catch'][arguments.0.body.type='Identifier'] CallExpression[callee.property.name='from']",
          message:
            "Swallowed Supabase error: .catch(() => undefined) hides failures. Destructure { error } and handle/log it.",
        },
        {
          selector:
            "CallExpression[callee.property.name='catch'][arguments.0.body.type='BlockStatement'][arguments.0.body.body.length=0] CallExpression[callee.property.name='from']",
          message:
            "Swallowed Supabase error: .catch(() => {}) hides failures. Destructure { error } and handle/log it.",
        },
        {
          selector:
            "ExpressionStatement > AwaitExpression CallExpression[callee.property.name=/^(insert|update|upsert|delete)$/][callee.object.callee.property.name='from']",
          message:
            "Supabase write with discarded result — the { error } is never checked, so failures are silent. Use: const { error } = await ... and handle it.",
        },
        {
          selector:
            "ExpressionStatement > CallExpression[callee.property.name=/^(insert|update|upsert|delete)$/][callee.object.callee.property.name='from']",
          message:
            "Fire-and-forget Supabase write — errors are invisible. Await it and check { error }, or route it through a helper that logs failures.",
        },
      ],
    },
  },
  {
    // lib/supabase.ts is a do-not-touch file (CLAUDE.md §12). Its two
    // violations are the deprecated createNotification (documented, replaced
    // by lib/notify.ts) and logActivity — exempted here instead of edited.
    files: ["src/lib/supabase.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // ── Gateway action layer shape (CLAUDE.md §20.11) ────────────────────────
    // TanStack Start's server-fn transform only finds statically-analysable
    // TOP-LEVEL createServerFn(...).handler(...) calls. A createServerFn
    // returned from a factory is never transformed, so its handler — including
    // requireUser, the service-role client and the pack_api RPC — is bundled
    // into the CLIENT and executes in the browser. That was a real eleven-day
    // outage, not a hypothetical.
    //
    // This rule catches the wrong SHAPE at author time. scripts/check-action-
    // split.mjs independently catches a wrong ARTIFACT at build time — keep
    // both; the artifact check is the one that would have caught the original
    // bug, since the source was correct and the bundle was not.
    files: ["src/lib/actions/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ReturnStatement > CallExpression[callee.name='createServerFn']",
          message:
            "Do not return createServerFn() from a function. TanStack Start's transform cannot see it, so the handler ships to the CLIENT and runs in the browser without the service-role key (CLAUDE.md §20.11). Declare createServerFn at module top level; have the factory return the ActionDef object instead.",
        },
        {
          selector:
            "ReturnStatement > MemberExpression[object.callee.name='createServerFn']",
          message:
            "Do not return a createServerFn(...) chain from a function — the server-fn transform cannot see it and the handler will be bundled client-side (CLAUDE.md §20.11).",
        },
        {
          selector:
            "CallExpression[callee.property.name='handler'] > ArrowFunctionExpression > BlockStatement",
          message:
            "A gateway action's .handler() must be a single expression handing off to runAction(<def>, data) — not a block body. Authorization and the record append are enforced inside runAction; inlining logic here bypasses the chokepoint (CLAUDE.md §13.2/§3.7, §20.11).",
        },
      ],
    },
  },
  eslintPluginPrettier,
);
