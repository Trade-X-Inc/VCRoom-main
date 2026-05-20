export function getEnvVar(key: string): string {
  // Try process.env first (works locally)
  if (process.env[key]) return process.env[key]!;

  // Try globalThis.Cloudflare.env (Cloudflare Pages runtime)
  const cf = (globalThis as any).Cloudflare;
  if (cf?.env?.[key]) return cf.env[key];
  if (cf?.context?.env?.[key]) return cf.context.env[key];
  if (cf?.[key]) return cf[key];

  return "";
}
