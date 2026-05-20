export function getEnvVar(key: string): string {
  // process.env (local dev)
  if (process.env[key]) return process.env[key]!;

  // import.meta.env with VITE_ prefix — Cloudflare Pages injects VITE_ secrets
  // at build time via Vite's define plugin, making them available in SSR bundles
  const metaEnv = (import.meta as any).env || {};
  const viteKey = key.startsWith("VITE_") ? key : `VITE_${key}`;
  if (metaEnv[viteKey]) return metaEnv[viteKey];
  if (metaEnv[key]) return metaEnv[key];

  return "";
}
