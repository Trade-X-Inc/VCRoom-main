import { createAPIHandler } from "@tanstack/react-start/api";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default createAPIHandler({
  method: "POST",
  handler: async ({ request }) => {
    try {
      const body = (await request.json()) as any;
      const { type, data } = body;

      const supabaseUrl =
        process.env.SUPABASE_URL || (globalThis as any).SUPABASE_URL || "";
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (globalThis as any).SUPABASE_SERVICE_ROLE_KEY ||
        "";

      if (supabaseUrl && supabaseKey) {
        await fetch(`${supabaseUrl}/rest/v1/email_events`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            event_type: type,
            email_id: data?.email_id,
            to_email: Array.isArray(data?.to) ? data.to[0] : data?.to,
            tags: data?.tags ?? null,
          }),
        });
      }

      if (type === "email.bounced") {
        console.warn("Bounced email:", Array.isArray(data?.to) ? data.to[0] : data?.to);
      }

      return json({ ok: true });
    } catch (e) {
      console.error("Resend webhook error:", e);
      return json({ ok: false }, 500);
    }
  },
});
