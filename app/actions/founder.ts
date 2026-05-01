"use server";
import { adminSupabase } from "@/lib/server-supabase";
import { startupSchema } from "@/lib/validation";
import { z } from "zod";

export async function upsertStartup(formData: FormData) {
  const founder_id = z.string().uuid().parse(String(formData.get("founder_id")));
  const payload = startupSchema.extend({ description: z.string().min(10) }).parse({
    company_name: formData.get("company_name"), sector: formData.get("sector"), stage: formData.get("stage"), country: formData.get("country"), funding_target: Number(formData.get("funding_target")), valuation: Number(formData.get("valuation")), revenue: Number(formData.get("revenue")), traction: formData.get("traction"), team_size: Number(formData.get("team_size")), description: formData.get("description")
  });
  await adminSupabase().from("startups").upsert({ ...payload, founder_id }, { onConflict: "founder_id" });
}

export async function createDealRoom(formData: FormData) {
  const startup_id = z.string().uuid().parse(String(formData.get("startup_id")));
  const investor_org_id = z.string().uuid().parse(String(formData.get("investor_org_id")));
  const supabase = adminSupabase();
  const { data, error } = await supabase.from("deal_rooms").insert({ startup_id, investor_org_id, status: "new" }).select().single();
  if (error) throw new Error(error.message);
  const sections = ["Company Overview", "Founder Background", "Market Size", "Product", "Traction", "Revenue", "Financials", "Legal", "Cap Table", "Competition", "Risks", "Exit Potential"];
  await supabase.from("due_diligence_items").insert(sections.map((section) => ({ deal_room_id: data.id, section, status: "Not Started" })));
}
