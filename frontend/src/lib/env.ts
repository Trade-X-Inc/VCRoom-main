// In the Cloudflare Workers runtime with nodejs_compat + @cloudflare/vite-plugin,
// process.env is bridged to CF bindings via the unenv polyfill.
// Locally (dev), falls back to process.env from .env.local.
export function getEnvVar(key: string): string {
  return process.env[key] || "";
}
