import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { to, subject, message, inviteLink } = await req.json();
    if (!to || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 500 });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>${String(message).replace(/\n/g, "<br/>")}</p>
        ${inviteLink ? `<p><a href="${inviteLink}">Open invite link</a></p>` : ""}
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Venture Room <noreply@updates.ventureroom.app>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const text = await resendResponse.text();
      return NextResponse.json({ error: text || "Resend API call failed." }, { status: 502 });
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invite send failed." }, { status: 500 });
  }
}
