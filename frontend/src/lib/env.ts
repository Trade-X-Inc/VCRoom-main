/**
 * SECURITY: getEnvVar() checks __cf_env FIRST (Cloudflare runtime secrets).
 * Server-only secrets (API keys, tokens) must NOT have VITE_ prefix.
 * VITE_ vars are baked into the JS bundle and visible to anyone.
 * See SECURITY.md for the full rules.
 */
export function getEnvVar(key: string): string {
  const sources = [
    // 1. CF runtime secrets (injected at request time — no VITE_ prefix in CF)
    () => (globalThis as any).__cf_env?.[key],
    () => (globalThis as any).__cf_env?.[`VITE_${key}`],
    // 2. process.env (nodejs_compat fallback for CF Pages secrets)
    () => typeof process !== "undefined" ? process.env?.[key] : undefined,
    () => typeof process !== "undefined" ? process.env?.[`VITE_${key}`] : undefined,
    // 3. Build-time inlined vars (VITE_ prefix, public only)
    () => (import.meta as any).env?.[key],
    () => (import.meta as any).env?.[`VITE_${key}`],
  ];

  for (const source of sources) {
    try {
      const val = source();
      if (val) return String(val);
    } catch {}
  }
  return "";
}

export function initCFEnv(env: Record<string, string>) {
  (globalThis as any).__cf_env = env;
  // Also push into process.env so existing process.env[key] checks work
  if (typeof process !== "undefined" && process.env) {
    for (const [k, v] of Object.entries(env)) {
      if (typeof v === "string" && !process.env[k]) {
        process.env[k] = v;
      }
    }
  }
  const safeKeys = Object.keys(env).filter(
    (k) => !k.toLowerCase().includes("key") && !k.toLowerCase().includes("secret") && !k.toLowerCase().includes("token"),
  );
  console.log("[env] CF env injected. Non-secret keys:", safeKeys);
}
