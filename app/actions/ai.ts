"use server";
import { adminSupabase } from "@/lib/server-supabase";
export async function saveAiReport(formData:FormData){await adminSupabase().from("ai_reports").insert({deal_room_id:String(formData.get("deal_room_id")),report_type:String(formData.get("report_type")),content:String(formData.get("content"))});}
