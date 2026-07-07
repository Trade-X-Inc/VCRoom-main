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
    envPrefix: ["VITE_", "NEXT_PUBLIC_", "OPENAI_"],
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