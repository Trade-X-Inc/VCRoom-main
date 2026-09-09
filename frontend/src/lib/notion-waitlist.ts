import { createServerFn } from "@tanstack/react-start";

// Waitlist submission -> Notion, added while new signups are paused.
// "Lengdon Waitlist" database, created for this task (9 Sep 2026).
// Same token (NOTION_API_KEY, already live in __cf_env for notion-blog.ts)
// and the same raw-fetch-against-api.notion.com pattern — no new secret,
// no SDK dependency added.
const DATA_SOURCE_ID = "54f8f92a-0c73-4e84-8eb3-9eb705062f99";

export const submitWaitlistEntry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as {
    name: string;
    email: string;
    role?: "founder" | "investor" | "";
    source: "sign-up page" | "footer newsletter";
  })
  .handler(async ({ data }) => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const key = cfEnv.NOTION_API_KEY || "";
    if (!key) {
      console.error("[Notion Waitlist] NOTION_API_KEY not found in __cf_env");
      return { ok: false };
    }

    try {
      const res = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { data_source_id: DATA_SOURCE_ID },
          properties: {
            Name: { title: [{ text: { content: data.name || data.email } }] },
            Email: { email: data.email },
            Role: { select: { name: data.role || "unspecified" } },
            Source: { select: { name: data.source } },
            Submitted: { date: { start: new Date().toISOString() } },
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error("[Notion Waitlist] Create page failed:", body);
        return { ok: false };
      }

      return { ok: true };
    } catch (e) {
      console.error("[Notion Waitlist] error:", e);
      return { ok: false };
    }
  });
