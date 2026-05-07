import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type AppRole = "founder" | "investor";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: "Owner" | "Admin" | "Member" | "Viewer";
  appRole: AppRole;
  workspace: string;
}

interface AuthCtx {
  user: AppUser | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AppUser>;
  signUp: (name: string, email: string, password: string, inviteToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setAppRole: (r: AppRole) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const buildUser = async (userId: string, email: string, userMetadata?: Record<string, any>): Promise<AppUser> => {
    const { data } = await supabase.from("users").select("full_name, role").eq("id", userId).single();
    const dbRole = data?.role as string | null | undefined;
    const metaRole = userMetadata?.role as string | null | undefined;
    // Fall back to auth metadata role if DB has no role (e.g. upsert failed during signup)
    const appRole: AppRole = (dbRole === "investor" || (!dbRole && metaRole === "investor")) ? "investor" : "founder";
    const name: string = (data?.full_name as string | null) || (userMetadata?.full_name as string | null) || email.split("@")[0] || "User";
    const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "VR";
    return {
      id: userId,
      email,
      name,
      initials,
      role: "Owner",
      appRole,
      workspace: appRole === "investor" ? "Investor Workspace" : "Founder Workspace",
    };
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user?.id && data.user.email) {
        setUser(await buildUser(data.user.id, data.user.email, data.user.user_metadata));
      }
      setHydrated(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.id && session.user.email) {
        setUser(await buildUser(session.user.id, session.user.email, session.user.user_metadata));
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<AppUser> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user?.id || !data.user.email) throw new Error("Sign-in failed.");
    const appUser = await buildUser(data.user.id, data.user.email, data.user.user_metadata);
    setUser(appUser);
    return appUser;
  };

  const signUp = async (name: string, email: string, password: string, _inviteToken?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role: "founder" } },
    });
    if (error) throw error;
    if (!data.user?.id) throw new Error("Sign-up failed.");
    await supabase.from("users").upsert({ id: data.user.id, email, role: "founder", full_name: name });
    setUser(await buildUser(data.user.id, email));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const setAppRole = (r: AppRole) => {
    if (!user) return;
    setUser({ ...user, appRole: r, workspace: r === "investor" ? "Investor Workspace" : "Founder Workspace" });
  };

  return (
    <Ctx.Provider value={{ user: hydrated ? user : null, isAuthenticated: !!user, signIn, signUp, signOut, setAppRole }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
