import { getEnvVar } from "@/lib/env";

// Provider endpoints and credentials for outbound email, CRM and Notion writes. Plain server module (policy D):
// nothing here is a server function and nothing client-reachable imports it.
//
// The *_API_BASE variables exist so tests can point each provider at a local mock server. They are read from the
// server's environment only, never from a request, and a value is accepted only if it is the real provider URL or
// a loopback address.

export type ProviderEnv = {
  supabaseUrl: string;
  serviceKey: string;
  anonKey: string;
  resendBase: string;
  resendKey: string;
  hubspotBase: string;
  hubspotToken: string;
  notionBase: string;
  notionKey: string;
  appUrl: string;
};

const DEFAULTS = {
  resend: "https://api.resend.com",
  hubspot: "https://api.hubapi.com",
  notion: "https://api.notion.com",
} as const;

export function safeBase(candidate: string, fallback: string): string {
  const c = (candidate || "").replace(/\/+$/, "");
  if (!c) return fallback;
  if (c === fallback) return c;
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(c)) return c;
  return fallback;
}

export function readProviderEnv(): ProviderEnv {
  return {
    supabaseUrl: getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL"),
    serviceKey: getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
    anonKey:
      getEnvVar("SUPABASE_ANON_KEY") || getEnvVar("VITE_SUPABASE_ANON_KEY"),
    resendBase: safeBase(getEnvVar("RESEND_API_BASE"), DEFAULTS.resend),
    resendKey: getEnvVar("RESEND_API_KEY"),
    hubspotBase: safeBase(getEnvVar("HUBSPOT_API_BASE"), DEFAULTS.hubspot),
    hubspotToken: getEnvVar("HUBSPOT_PRIVATE_APP_TOKEN"),
    notionBase: safeBase(getEnvVar("NOTION_API_BASE"), DEFAULTS.notion),
    notionKey: getEnvVar("NOTION_API_KEY"),
    appUrl: getEnvVar("VITE_APP_URL") || "https://lengdon.com",
  };
}
