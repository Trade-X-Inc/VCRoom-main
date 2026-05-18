import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type MemoInput = {
  dealRoomId: string;
  userId: string;
  openAIKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  userAccessToken?: string;
};

export const generateInvestorMemo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): MemoInput => data as MemoInput)
  .handler(async ({ data }: { data: MemoInput }): Promise<{ memo: string }> => {
    const supabaseUrl =
      data.supabaseUrl ||
      process.env.VITE_SUPABASE_URL ||
      (globalThis as any).VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      (globalThis as any).SUPABASE_URL ||
      "";
    const supabaseKey =
      data.supabaseAnonKey ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      (globalThis as any).VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      (globalThis as any).SUPABASE_ANON_KEY ||
      "";

    const openAIKey =
      data.openAIKey ||
      (globalThis as any).OPENAI_API_KEY ||
      (globalThis as any).VITE_OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

    if (!supabaseUrl || !supabaseKey || !openAIKey) {
      return {
        memo: `## Investment Memo\n\n*AI analysis requires OpenAI and Supabase configuration.*`,
      };
    }

    const client = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${data.userAccessToken ?? ""}` } },
    });

    // 1. Fetch deal room + startup
    const { data: room } = await client
      .from("deal_rooms")
      .select("startup_id")
      .eq("id", data.dealRoomId)
      .single();

    const { data: startup } = room?.startup_id
      ? await client
          .from("startups")
          .select("company_name, sector, stage, funding_target, traction, description, revenue, founder_name")
          .eq("id", room.startup_id)
          .maybeSingle()
      : { data: null };

    // 2. Fetch documents list
    const { data: docs } = await client
      .from("documents")
      .select("name, category")
      .eq("deal_room_id", data.dealRoomId);

    // 3. Fetch Q&A messages
    const { data: messages } = await client
      .from("messages")
      .select("body, metadata, is_qa")
      .eq("deal_room_id", data.dealRoomId)
      .order("created_at", { ascending: false })
      .limit(20);

    // 4. Fetch task completion
    const { data: tasks } = await client
      .from("deal_tasks")
      .select("completed")
      .eq("deal_room_id", data.dealRoomId);

    const totalTasks = tasks?.length ?? 0;
    const doneTasks = tasks?.filter((t) => t.completed).length ?? 0;
    const taskCompletion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const docList = (docs ?? []).map((d) => `${d.name}${d.category ? ` (${d.category})` : ""}`).join(", ") || "None uploaded";
    const qaSummary = (messages ?? [])
      .filter((m) => m.is_qa)
      .slice(0, 8)
      .map((m) => `[${m.metadata?.authorRole ?? "Investor"}]: ${m.body}${m.metadata?.answer ? `\n  → ${m.metadata.answer}` : ""}`)
      .join("\n") || "No Q&A yet";

    const prompt = `You are an experienced VC analyst. Generate a structured investment memo for this startup based on the available data.

Startup: ${startup?.company_name ?? "Unknown"}
Sector: ${startup?.sector ?? "Unknown"}
Stage: ${startup?.stage ?? "Unknown"}
Raise: ${startup?.funding_target ?? "Unknown"}
Revenue: ${startup?.revenue ?? "Not disclosed"}
Traction: ${startup?.traction ?? "Not provided"}
Founder: ${startup?.founder_name ?? "Unknown"}
Description: ${startup?.description ?? "Not provided"}

Documents provided: ${docList}
Q&A summary:
${qaSummary}
Diligence completion: ${taskCompletion}%

Generate a memo with these sections:
## Executive Summary
## Team Assessment
## Market Opportunity
## Traction & Metrics
## Key Risks
## Investment Recommendation

Be specific and data-driven. Flag any missing information as gaps. Use markdown formatting.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1200,
        temperature: 0.3,
        messages: [
          { role: "system", content: "You are an experienced VC investment analyst. Write concise, professional investment memos in markdown format." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) throw new Error("OpenAI request failed");
    const json = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
    return { memo: json.choices[0]?.message?.content ?? "" };
  });
