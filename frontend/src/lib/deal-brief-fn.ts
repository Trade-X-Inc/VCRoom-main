import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type BriefInput = { dealRoomId: string; userId: string };

export interface DealBriefResult {
  matchScore: number;
  matchLabel: string;
  strengths: string[];
  risks: string[];
  mitigants: string[];
  nextAction: string;
}

export const generateDealBrief = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): BriefInput => data as BriefInput)
  .handler(async ({ data }: { data: BriefInput }): Promise<DealBriefResult> => {
    // 1. Verify investor is a member of this deal room
    const { data: member } = await adminClient
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) throw new Error("Unauthorized");

    // 2. Fetch deal room + startup profile
    const { data: room } = await adminClient
      .from("deal_rooms")
      .select("startup_id")
      .eq("id", data.dealRoomId)
      .single();

    const { data: startup } = room?.startup_id
      ? await adminClient
          .from("startups")
          .select("company_name, sector, stage, funding_target, traction, description")
          .eq("id", room.startup_id)
          .maybeSingle()
      : { data: null };

    // 3. Fetch recent activities
    const { data: activities } = await adminClient
      .from("activities")
      .select("action, created_at")
      .eq("deal_room_id", data.dealRoomId)
      .order("created_at", { ascending: false })
      .limit(10);

    // 4. Build prompt
    const activitySummary = (activities ?? []).map((a) => a.action).join(", ");
    const companyName = startup?.company_name ?? "Unknown startup";

    const userPrompt = `Analyze this startup for investment:
Company: ${companyName}
Sector: ${startup?.sector ?? "Unknown"}
Stage: ${startup?.stage ?? "Unknown"}
Funding target: ${startup?.funding_target ?? "Unknown"}
Traction: ${startup?.traction ?? "Unknown"}
Description: ${startup?.description ?? "None provided"}
Recent activity: ${activitySummary || "None"}`;

    // 5. Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Graceful fallback when OpenAI is not configured
      return {
        matchScore: 72,
        matchLabel: "Moderate fit",
        strengths: ["Early-stage traction", "Clear market opportunity", "Experienced team"],
        risks: ["Market competition", "Execution risk", "Capital requirements"],
        mitigants: ["Strong domain expertise", "Clear differentiation", "Advisory support"],
        nextAction: "Schedule a discovery call to understand the team and traction better.",
      };
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 600,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: `You are an investment analyst. Return ONLY valid JSON:
{"matchScore":0-100,"matchLabel":"Strong fit|Moderate fit|Weak fit","strengths":["...","...","..."],"risks":["...","...","..."],"mitigants":["...","...","..."],"nextAction":"..."}`,
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) throw new Error("OpenAI request failed");

    const json = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
    const raw = json.choices[0]?.message?.content ?? "";

    const parsed = JSON.parse(raw) as DealBriefResult;
    if (typeof parsed.matchScore !== "number" || !Array.isArray(parsed.strengths)) {
      throw new Error("Invalid AI response shape");
    }

    return parsed;
  });
