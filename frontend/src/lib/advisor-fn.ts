import { createServerFn } from "@tanstack/react-start";

type StartupContext = {
  companyName?: string;
  stage?: string;
  sector?: string;
  fundingTarget?: string;
  revenue?: string;
  traction?: string;
  leadCount?: number;
  meetingCount?: number;
};

type AdvisorInput = {
  userId: string;
  message: string;
  history: Array<{ role: string; content: string }>;
  startupContext?: StartupContext;
  openAIKey?: string;
  pageContext?: string;  // current page/feature for targeted advice
};

type AdvisorResult = {
  reply: string;
  error: string | null;
};

export const getAIAdvice = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): AdvisorInput => data as AdvisorInput)
  .handler(async ({ data }: { data: AdvisorInput }): Promise<AdvisorResult> => {
    // ── AI Usage Cap Check ──
    if (data.userId) {
      try {
        const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
        const supabaseKey = (import.meta.env as any).VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
        if (supabaseUrl && supabaseKey) {
          const usageResp = await fetch(`${supabaseUrl}/rest/v1/rpc/check_and_increment_ai_usage`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
            body: JSON.stringify({ p_user_id: data.userId, p_feature: "advisor" }),
          });
          if (usageResp.ok) {
            const usageResult = await usageResp.json() as any;
            if (!usageResult.allowed) {
              return { reply: usageResult.message || "You've reached your daily AI limit (20 calls/day on free plan). Usage resets at midnight.", error: "usage_limit" };
            }
          }
        }
      } catch { /* fail open */ }
    }
    const openAIKey =
      process.env.OPENAI_API_KEY ||
      (import.meta.env as any).VITE_OPENAI_API_KEY ||
      '';
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured on server');
    }

    let context = "";
    if (data.startupContext) {
      const sc = data.startupContext;
      context = [
        `Company: ${sc.companyName || "Not set"}`,
        `Stage: ${sc.stage || "Not set"}`,
        `Sector: ${sc.sector || "Not set"}`,
        `Raising: ${sc.fundingTarget || "Not set"}`,
        `ARR/Revenue: ${sc.revenue || "Not set"}`,
        `Traction: ${sc.traction || "Not set"}`,
        `Active leads: ${sc.leadCount ?? 0}`,
        `Upcoming meetings: ${sc.meetingCount ?? 0}`,
      ].join("\n");
    }

    const lines = context ? context.split("\n") : [];
    const get = (prefix: string) => lines.find((l) => l.startsWith(prefix))?.split(": ")[1]?.trim() ?? "Not set";
    const company = get("Company");
    const stage = get("Stage");
    const sector = get("Sector");
    const raising = get("Raising");

    let advisorIdentity = "You are an expert startup fundraising advisor.";
    if (company && company !== "Not set") {
      advisorIdentity = `You are an expert startup fundraising advisor for ${company}, a ${stage !== "Not set" ? stage : "early-stage"} ${sector !== "Not set" ? sector : "tech"} startup raising ${raising !== "Not set" ? raising : "their next round"}.`;
    }

    // Detect the page/feature context from the message prefix
    const msg = data.message || "";
    const pageContext = (() => {
      if (msg.includes("Context: the") && msg.includes("deal room")) return "deal_room";
      if (msg.toLowerCase().includes("document vault") || msg.toLowerCase().includes("document request")) return "document_vault";
      if (msg.toLowerCase().includes("workstation") || msg.toLowerCase().includes("thesis alignment") || msg.toLowerCase().includes("due diligence")) return "workstation";
      if (msg.toLowerCase().includes("q&a") || msg.toLowerCase().includes("question")) return "qa";
      if (msg.toLowerCase().includes("pipeline") || msg.toLowerCase().includes("lead")) return "pipeline";
      if (msg.toLowerCase().includes("meeting")) return "meetings";
      if (msg.toLowerCase().includes("team") || msg.toLowerCase().includes("invite")) return "team";
      return "general";
    })();

    // Page-specific guidance injected into system prompt
    const pageGuidance: Record<string, string> = {
      deal_room: `You are the AI advisor inside a VentureRoom deal room. A deal room is a shared, secure space between a startup founder and an investor. It contains: Document Vault (uploaded files with AI summaries), Q&A (async questions between both parties), Workstation (investor's due diligence, thesis alignment scoring, document review), Team Chat (private internal team messaging), Notes, Activity log, and Meetings. Focus on deal-specific actions. If the user asks about uploading documents, tell them to use the Document Vault tab. If they ask about diligence, point them to the Workstation. If they ask about questions from investors, use the Q&A tab.`,
      document_vault: `The user is in the Document Vault. They can: upload files (PDF, PPTX, DOCX, XLSX, CSV, images, max 50MB), add docs from their personal library, generate AI summaries per document. Category tabs: Pitch Deck (always pinned first 📌), Financials, Legal, Market Research, Team, Product, Other. Investors can request specific documents using the 'Documents needed' panel — founders respond by uploading a file, sharing a link (Google Drive/DocSend), or marking as uploaded. Help them organise and complete their document set.`,
      workstation: `The user is in the Investor Workstation (Due Diligence). This is the investor's private workspace. Key features: Document review with thesis alignment analysis per file (AI reads the full document and compares against the investor's thesis from their Profile), Investment Scorecard (rate the startup 1-5 across Team, Market, Product, Traction, Financials, Thesis Fit), Media & Links (pitch deck auto-detected from Document Vault). Thesis alignment requires: investor fills their Profile with thesis/sectors/stages/check_size/red_flags/key_metrics. Then they click 'Analyze against my thesis' on any document — works even without AI summary.`,
      qa: `The user is in the Q&A section. This is structured async Q&A between the investor and founder. Questions are organized as expandable cards. Investors post questions, founders answer. Both parties can see the exchange. Help them frame good due diligence questions or answers. Common investor questions: business model, unit economics, team background, competitive moat, go-to-market, key risks.`,
      pipeline: `The user is asking about their investor pipeline. VentureRoom tracks VC leads with stages, activities, and notes. Help them prioritize outreach, identify investors to follow up, or analyze their funnel conversion. Be specific about which leads need attention based on their context.`,
      meetings: `The user is asking about meetings. VentureRoom lets you schedule investor meetings, track outcomes, and log notes. Help them prepare for upcoming meetings, summarize past ones, or decide next steps after a meeting.`,
      team: `The user is asking about team/invites. In VentureRoom, founders can invite team members and investors to deal rooms. Investors join via secure invite links and sign NDAs on entry. Help them manage their team or understand the invite flow.`,
      general: `You are the AI advisor for VentureRoom — a VC deal room platform. Key features founders use: Document Vault (secure file sharing), Q&A (async investor questions), Deal Rooms (shared spaces with investors), AI Advisor (fundraising guidance), Pipeline (track investors), Meetings. Key features investors use: Workstation (due diligence), Thesis Alignment (AI-powered document analysis against their investment thesis), Investment Scorecard, Deal Flow, AI Analysis. Help with fundraising strategy, investor relations, and deal room usage.`,
    };

    const platformContext = pageGuidance[pageContext] || pageGuidance.general;

    const systemPrompt = [
      advisorIdentity,
      "",
      "PLATFORM CONTEXT:",
      platformContext,
      "",
      "RESPONSE RULES:",
      "- Maximum 200 words per response",
      "- Use **bold** for key terms and bullet points for lists",
      "- Be specific to this user's situation — not generic advice",
      "- If they ask about a VentureRoom feature, explain exactly where to find it and how to use it",
      "- If they ask a general fundraising question, answer it with their company context in mind",
      "- Never say 'I don't know' — always give your best guidance and suggest the relevant VentureRoom feature",
      company !== "Not set" ? `\nUSER COMPANY: ${company} | Stage: ${stage} | Sector: ${sector} | Raising: ${raising}` : "",
    ].filter(Boolean).join("\n");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 300,
          messages: [
            { role: "system", content: systemPrompt },
            ...data.history.slice(-6),
            { role: "user", content: data.message },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as any;
        console.error("OpenAI error:", err);
        return {
          reply: `AI error: ${err?.error?.message || "Unknown error"}`,
          error: "api_error",
        };
      }

      const result = await response.json() as { choices: Array<{ message: { content: string } }> };
      return {
        reply: result.choices[0].message.content,
        error: null,
      };
    } catch (err: any) {
      console.error("Fetch error:", err);
      return {
        reply: "Connection error. Please try again.",
        error: "fetch_error",
      };
    }
  });