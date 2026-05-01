import { createClient } from "@supabase/supabase-js";
import { ensureEnv } from "@/lib/env";
export const adminSupabase = () => { ensureEnv(); return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); };
