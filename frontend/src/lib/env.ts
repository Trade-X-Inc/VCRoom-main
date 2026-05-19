export function getEnvVar(key: string): string {
  if (process.env[key]) return process.env[key]!;
  return "";
}

export const clientEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
};
