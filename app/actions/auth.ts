"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminSupabase } from "@/lib/server-supabase";
import { z } from "zod";

const authSchema = z.object({ email: z.string().email(), password: z.string().min(8), role: z.enum(["founder", "investor"]).optional(), full_name: z.string().min(2).optional() });

export async function signupAction(formData: FormData) {
  const parsed = authSchema.parse({ email: formData.get("email"), password: formData.get("password"), role: formData.get("role"), full_name: formData.get("full_name") });
  const role = parsed.role ?? "founder";
  const supabase = adminSupabase();
  
  // Use public signUp instead of admin.createUser to allow standard auth flow
  const { data, error } = await supabase.auth.signUp({ 
    email: parsed.email, 
    password: parsed.password, 
    options: {
      data: { role, full_name: parsed.full_name }
    }
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Signup failed");

  await supabase.from("users").upsert({ id: data.user.id, email: parsed.email, role, full_name: parsed.full_name });
  cookies().set("vr_email", parsed.email, { httpOnly: true, path: "/" });
  cookies().set("vr_role", role, { httpOnly: true, path: "/" });
  redirect(role === "founder" ? "/founder/overview" : "/investor/deal-pipeline");
}

export async function loginAction(formData: FormData) {
  const parsed = authSchema.pick({ email: true, password: true }).parse({ email: formData.get("email"), password: formData.get("password") });
  const supabase = adminSupabase();

  // Fix: Verify password with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Authentication failed");

  const { data: userData } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
  const role = userData?.role === "investor" ? "investor" : "founder";

  cookies().set("vr_email", parsed.email, { httpOnly: true, path: "/" });
  cookies().set("vr_role", role, { httpOnly: true, path: "/" });
  redirect(role === "founder" ? "/founder/overview" : "/investor/deal-pipeline");
}
export async function logoutAction() { 
  const supabase = adminSupabase();
  await supabase.auth.signOut();
  cookies().delete("vr_email"); 
  cookies().delete("vr_role"); 
  redirect('/login'); 
}
