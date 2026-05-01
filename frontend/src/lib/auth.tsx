import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: "founder" | "investor";
}

interface AuthCtx {
  user: AppUser | null;
  isAuthenticated: boolean;
  signIn: (email: string, _password: string) => Promise<void>;
  signUp: (name: string, email: string, _password: string, inviteToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const buildUser = async (userId: string, email: string): Promise<AppUser> => {
    const { data } = await supabase.from("users").select("full_name, role").eq("id", userId).single();
    const name = data?.full_name || email.split("@")[0] || "User";
    const initials = name
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return {
      id: userId,
      email,
      name,
      initials: initials || "VR",
      role: data?.role === "investor" ? "investor" : "founder",
    };
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user?.id && data.user.email) {
        setUser(await buildUser(data.user.id, data.user.email));
      }
      setHydrated(true);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user?.id || !data.user.email) throw new Error("Sign-in failed.");
    setUser(await buildUser(data.user.id, data.user.email));
  };

  const signUp = async (name: string, email: string, password: string, _token?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role: "founder" } },
    });
    if (error) throw error;
    if (!data.user?.id) throw new Error("Sign-up failed.");
    await supabase.from("users").upsert({
      id: data.user.id,
      email,
      role: "founder",
      full_name: name,
    });
    setUser(await buildUser(data.user.id, email));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user: hydrated ? user : null, isAuthenticated: !!user, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
