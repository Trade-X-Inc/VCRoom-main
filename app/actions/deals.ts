"use server";
import { adminSupabase } from "@/lib/server-supabase";
import { z } from "zod";

const allowed = ["application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

export async function uploadDocument(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file || file.size === 0) throw new Error("Please select a file.");
  if (!allowed.includes(file.type)) throw new Error("Only PDF, PPT, and XLS files are allowed.");
  const deal_room_id = z.string().uuid().parse(String(formData.get("deal_room_id")));
  const category = String(formData.get("category"));
  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${deal_room_id}/${Date.now()}-${file.name}`;
  const supabase = adminSupabase();
  await supabase.storage.from("documents").upload(path, buffer, { contentType: file.type, upsert: true });
  await supabase.from("documents").insert({ deal_room_id, category, status: "uploaded", storage_path: path, file_name: file.name, file_size: file.size, file_type: file.type });
}
export async function sendMessage(formData: FormData) { const body = z.string().min(1).parse(String(formData.get("body"))); await adminSupabase().from("messages").insert({ deal_room_id: String(formData.get("deal_room_id")), sender_id: String(formData.get("sender_id")), body }); }
export async function updateDealStatus(formData: FormData) { await adminSupabase().from("deal_rooms").update({ status: String(formData.get("status")) }).eq("id", String(formData.get("deal_room_id"))); }
export async function updateChecklist(formData: FormData) { await adminSupabase().from("due_diligence_items").update({ status: String(formData.get("status")) }).eq("id", String(formData.get("item_id"))); }
export async function saveDecision(formData: FormData) { const payload = { deal_room_id: String(formData.get("deal_room_id")), decided_by: String(formData.get("decided_by")), status: String(formData.get("status")), score: Number(formData.get("score")), risk_level: String(formData.get("risk_level")), notes: String(formData.get("notes")), next_action: String(formData.get("next_action")), follow_up_date: String(formData.get("follow_up_date")) }; await adminSupabase().from("decisions").upsert(payload, { onConflict: "deal_room_id" }); }
