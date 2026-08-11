import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { config as loadDotenv } from "dotenv";

// Dev-only: mirrors the production globalThis.__cf_env shape (normally injected
// by scripts/patch-wrangler.mjs in the Cloudflare Worker build) so server fns
// reading secrets via __cf_env work under `vite dev` too. apply: "serve" means
// Vite excludes this plugin entirely from the build graph — it never runs
// during `vite build` and never reaches dist/client/_worker.js.
const devCfEnvShim = {
  name: "dev-cf-env-shim",
  apply: "serve" as const,
  configureServer() {
    const envPath = new URL(".env.local", import.meta.url).pathname;
    const { parsed, error } = loadDotenv({ path: envPath });
    if (error) console.error("[dev-cf-env-shim] failed to load .env.local:", error);
    (globalThis as any).__cf_env = { ...(globalThis as any).__cf_env, ...parsed };
    console.log("[dev-cf-env-shim] loaded keys:", parsed ? Object.keys(parsed) : []);
  },
};

export default defineConfig({
  cloudflare: true,
  vite: {
    // SECURITY — do not add a secret-bearing prefix here. Every var matching a
    // listed prefix is INLINED into the client JS bundle as a literal.
    //
    // "OPENAI_" was removed 11 Aug 2026 after a live OpenAI API key was found
    // in plaintext in the production bundle (/assets/index-*.js, readable by
    // anyone). It was added by 6ae6dd6 (24 May 2026) to make the key resolve on
    // Cloudflare via `import.meta.env` fallbacks — a real problem, fixed the
    // wrong way. That problem is now solved properly: patch-wrangler.mjs sets
    // `globalThis.__cf_env` from the Cloudflare runtime secrets, and
    // getEnvVar() (src/lib/env.ts) reads __cf_env FIRST, then process.env.
    // No current source reads the OpenAI key via import.meta.env, so removing
    // this prefix cannot reopen the original issue — verified before removal.
    //
    // A prior remediation (f52e60e, "remove VITE_OPENAI from browser") moved
    // the calls server-side but left this line and the env var, so builds kept
    // shipping the key regardless. Removing the caller is not removing the
    // exposure. See CLAUDE.md §19e.
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [devCfEnvShim],
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
      hmr: {
        clientPort: 443,
        protocol: "wss",
      },
      headers: {
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
    },
  },
});