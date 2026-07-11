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
  eslintPluginPrettier,
);
