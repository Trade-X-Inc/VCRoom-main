import { supabase } from "./supabase";
import { Lead, Stage, Deal, PipelineStage } from "./mock";

/**
 * LEAD MANAGEMENT (Tasks 2, 3, 4)
 */
export async function getLeads(startupId: string) {
  const { data, error } = await supabase
    .from("vc_leads")
    .select("*")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Lead[];
}

export async function upsertLead(lead: Partial<Lead> & { startup_id: string }) {
  const { data, error } = await supabase
    .from("vc_leads")
    .upsert(lead)
    .select()
    .single();

  if (error) throw error;
  return data as Lead;
}

export async function deleteLead(id: string) {
  const { error } = await supabase.from("vc_leads").delete().eq("id", id);
  if (error) throw error;
}

export async function importLeadsCSV(startupId: string, rows: any[]) {
  const leads = rows.map(row => ({
    startup_id: startupId,
    name: row.name,
    firm: row.firm,
    stage: (row.stage as Stage) || "New",
    check_size: row.check,
    thesis: row.thesis,
    is_hot: !!row.hot,
    initials: row.name?.split(' ').map((n: any) => n[0]).join('').toUpperCase() || "VC"
  }));

  const { data, error } = await supabase.from("vc_leads").insert(leads).select();
  if (error) throw error;
  return data;
}

/**
 * PIPELINE & OVERVIEW STATS (Tasks 5, 6, 7)
 */
export async function getFounderOverviewStats(startupId: string) {
  const [leadsRes, roomsRes, docsRes] = await Promise.all([
    supabase.from("vc_leads").select("stage").eq("startup_id", startupId),
    supabase.from("deal_rooms").select("id").eq("startup_id", startupId),
    supabase.from("documents").select("id").eq("startup_id", startupId)
  ]);

  if (leadsRes.error) throw leadsRes.error;

  const leads = leadsRes.data || [];
  return {
    totalLeads: leads.length,
    contacted: leads.filter(l => l.stage !== 'New').length,
    replied: leads.filter(l => ['Replied', 'Meeting', 'Interested', 'Deal Room'].includes(l.stage)).length,
    activeDealRooms: roomsRes.data?.length || 0,
    documentsUploaded: docsRes.data?.length || 0
  };
}

export async function getInvestorOverviewStats() {
  const [roomsRes, diligenceRes, decisionsRes, messagesRes] = await Promise.all([
    supabase.from("deal_rooms").select("id"),
    supabase.from("due_diligence_items").select("id").eq("status", "todo"),
    supabase.from("decisions").select("id"),
    supabase.from("messages").select("id", { count: 'exact', head: true }).eq("is_read", false)
  ]);

  return {
    activeStartups: roomsRes.data?.length || 0,
    pendingDiligence: diligenceRes.data?.length || 0,
    decisions: decisionsRes.data?.length || 0,
    newMessages: messagesRes.count || 0
  };
}

/**
 * DEAL ROOM DATA (Task 8)
 */
export async function getFullDealRoom(roomId: string) {
  const [room, docs, msgs, checklist, notes, timeline, decisions] = await Promise.all([
    supabase.from("deal_rooms").select("*, startups(*)").eq("id", roomId).single(),
    supabase.from("documents").select("*").eq("deal_room_id", roomId),
    supabase.from("messages").select("*").eq("deal_room_id", roomId).order("created_at"),
    supabase.from("due_diligence_items").select("*").eq("deal_room_id", roomId),
    supabase.from("notes").select("*").eq("deal_room_id", roomId),
    supabase.from("activities").select("*").eq("deal_room_id", roomId).order("created_at", { ascending: false }),
    supabase.from("decisions").select("*").eq("deal_room_id", roomId)
  ]);

  if (room.error) throw room.error;

  return {
    room: room.data,
    documents: docs.data || [],
    messages: msgs.data || [],
    checklist: checklist.data || [],
    notes: notes.data || [],
    timeline: timeline.data || [],
    decisions: decisions.data || []
  };
}

/**
 * VALIDATION HELPER (Task 9)
 */
export async function safeRequest<T>(req: Promise<{data: T | null, error: any}>) {
    const { data, error } = await req;
    if (error) {
        console.error("Supabase Request Error:", error);
        throw new Error(error.message || "Database operation failed");
    }
    return data as T;
}