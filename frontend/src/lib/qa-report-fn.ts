import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const completeQaAndGenerateReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { dealRoomId: string; userId: string })
  .handler(async ({ data }): Promise<{ ok: boolean; documentId?: string; error?: string }> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const serviceKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY || cfEnv.SUPABASE_SERVICE_KEY || "";
    const supabaseUrl = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
    if (!serviceKey) return { ok: false, error: "no service key" };

    const svc = createClient(supabaseUrl, serviceKey);
    const { dealRoomId, userId } = data;

    // 1. Fetch deal room + startup
    const { data: room } = await svc
      .from("deal_rooms")
      .select("investor_name, investor_user_id, startup_id, startups(company_name)")
      .eq("id", dealRoomId)
      .single();

    if (!room) return { ok: false, error: "deal room not found" };

    const companyName = (room as any).startups?.company_name ?? "the Company";
    const investorName = (room as any).investor_name ?? "Investor";

    // 2. Fetch all questions for this deal room, ordered oldest first
    const { data: questions } = await svc
      .from("deal_room_qa")
      .select("*")
      .eq("deal_room_id", dealRoomId)
      .eq("is_question", true)
      .is("parent_id", null)
      .order("created_at", { ascending: true });

    if (!questions?.length) return { ok: false, error: "no questions found" };

    // 3. Fetch all answers (rows with parent_id set)
    const { data: answers } = await svc
      .from("deal_room_qa")
      .select("*")
      .eq("deal_room_id", dealRoomId)
      .eq("is_question", false)
      .not("parent_id", "is", null);

    const answerMap: Record<string, any> = {};
    for (const ans of answers ?? []) {
      if (!answerMap[ans.parent_id]) answerMap[ans.parent_id] = ans;
    }

    const answeredCount = questions.filter((q) => !!answerMap[q.id]).length;
    const generatedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    // 4. Build report text
    const qaLines = questions.map((q, i) => {
      const ans = answerMap[q.id];
      const askedDate = new Date(q.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const ansDate = ans?.answered_at
        ? new Date(ans.answered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";
      return [
        `Q${i + 1}. ${q.content}`,
        `Asked by: ${q.sender_name} · ${askedDate}`,
        `Answer: ${ans ? ans.content : "No answer provided"}`,
        `Answered by: ${ans ? `${ans.sender_name} · ${ansDate}` : "—"}`,
      ].join("\n");
    }).join("\n\n");

    const reportText = [
      "Q&A REPORT",
      "",
      `Deal room: ${companyName} / ${investorName}`,
      `Startup: ${companyName}`,
      `Investor: ${investorName}`,
      `Generated: ${generatedDate}`,
      `Questions: ${questions.length} | Answered: ${answeredCount} | Unanswered: ${questions.length - answeredCount}`,
      "",
      "———",
      "",
      qaLines,
      "",
      "———",
      "",
      "This Q&A was conducted under the deal room NDA signed by all parties on the Hockystick platform.",
    ].join("\n");

    // 5. Insert into documents (Information Vault)
    const fileName = `Q&A Report — ${companyName} — ${generatedDate}.pdf`;
    const { data: doc, error: docErr } = await svc
      .from("documents")
      .insert({
        deal_room_id: dealRoomId,
        uploader_id: userId,
        category: "qa_report",
        status: "complete",
        file_name: fileName,
        storage_path: null,
        report_text: reportText,
        visibility: "shared",
        uploaded_by_role: "investor",
      })
      .select()
      .single();

    if (docErr) {
      console.error("[qa-report-fn] documents insert error:", docErr);
      return { ok: false, error: docErr.message };
    }

    // 6. Mark deal room Q&A complete
    await svc
      .from("deal_rooms")
      .update({ qa_completed_at: new Date().toISOString(), qa_completed_by: userId })
      .eq("id", dealRoomId);

    console.log(`[qa-report-fn] Q&A complete for deal room ${dealRoomId} — doc ${(doc as any).id}`);
    return { ok: true, documentId: (doc as any).id };
  });
