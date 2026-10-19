// In-process mock of Resend, HubSpot, Notion and the slice of Supabase (Auth and PostgREST) that the email handlers
// use. It listens on a loopback port chosen by the OS, records every call, and holds a few fixed people and rows.
// Used only by tests/email-lockdown.spec.ts. No real network, no real keys.
import http from "node:http";
import type { AddressInfo } from "node:net";

export const ALICE = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "alice@example.invalid",
  name: "Alice",
};
export const BOB = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "bob@example.invalid",
  name: "Bob",
};
export const CAROL = {
  id: "77777777-7777-4777-8777-777777777777",
  email: "carol@example.invalid",
  name: "Carol",
};
export const ROOM = "33333333-3333-4333-8333-333333333333";
export const STARTUP = "66666666-6666-4666-8666-666666666666";
export const OWN_TEAM_TOKEN = "44444444-4444-4444-8444-444444444444"; // created by Alice, who founded the startup
export const FOREIGN_TEAM_TOKEN = "55555555-5555-4555-8555-555555555555"; // created by Bob
export const OWN_LAWYER_TOKEN = "88888888-8888-4888-8888-888888888888"; // created by Alice, a member of the room
export const FOREIGN_LAWYER_TOKEN = "99999999-9999-4999-8999-999999999999"; // created by Bob
export const INVITEE = "invitee@example.invalid";
export const LAWYER = "lawyer@example.invalid";

export type Mock = {
  baseUrl: string;
  hits: {
    resend: number;
    resendBodies: any[];
    hubspot: number;
    notion: number;
    auth: number;
    sentTo: string[];
    hubspotBodies: any[];
    notionBodies: any[];
  };
  events: any[];
  reset(): void;
  close(): Promise<void>;
};

const SESSIONS: Record<
  string,
  { id: string; email: string; confirmed: boolean; name: string }
> = {
  "tok-alice": { ...ALICE, confirmed: true },
  "tok-bob": { ...BOB, confirmed: true },
  "tok-carol": { ...CAROL, confirmed: true },
  "tok-unconfirmed": {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    email: "new@example.invalid",
    confirmed: false,
    name: "New",
  },
};

export async function startMock(): Promise<Mock> {
  const hits = {
    resend: 0,
    resendBodies: [],
    hubspot: 0,
    notion: 0,
    auth: 0,
    sentTo: [] as string[],
    hubspotBodies: [] as any[],
    notionBodies: [] as any[],
  };
  const events: any[] = [];
  const send = (res: http.ServerResponse, code: number, body: unknown) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const matchesTags = (tags: any[], want: any[]) =>
    want.every((w) =>
      tags.some((t) => Object.entries(w).every(([k, v]) => t[k] === v)),
    );

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const p = url.pathname;
      const bearer = String(req.headers.authorization ?? "").replace(
        "Bearer ",
        "",
      );
      const body = raw ? JSON.parse(raw) : {};
      if (p === "/emails") {
        hits.resend += 1;
        hits.sentTo.push(...(body.to ?? []));
        hits.resendBodies.push(body);
        return send(res, 200, { id: "mock-email-" + hits.resend });
      }
      if (p.startsWith("/crm/v3/objects/contacts")) {
        hits.hubspot += 1;
        if (!p.endsWith("/search")) hits.hubspotBodies.push(body);
        return send(
          res,
          200,
          p.endsWith("/search") ? { results: [] } : { id: "1" },
        );
      }
      if (p === "/v1/pages") {
        hits.notion += 1;
        hits.notionBodies.push(body);
        return send(res, 200, { id: "page" });
      }
      if (p === "/auth/v1/user") {
        hits.auth += 1;
        const s = SESSIONS[bearer];
        if (!s) return send(res, 401, { msg: "invalid" });
        return send(res, 200, {
          id: s.id,
          email: s.email,
          email_confirmed_at: s.confirmed ? "2026-01-01T00:00:00Z" : null,
          user_metadata: { full_name: s.name },
        });
      }
      if (p.startsWith("/auth/v1/admin/users/")) {
        const id = p.split("/").pop();
        const u = [ALICE, BOB, CAROL].find((x) => x.id === id);
        return u
          ? send(res, 200, { id: u.id, email: u.email })
          : send(res, 404, {});
      }
      if (p.startsWith("/rest/v1/")) {
        const table = p.split("/").pop() as string;
        const q = url.searchParams;
        const single = String(req.headers.accept ?? "").includes(
          "vnd.pgrst.object",
        );
        const out = (rows: any[]) =>
          single
            ? rows.length
              ? send(res, 200, rows[0])
              : send(res, 406, { code: "PGRST116" })
            : send(res, 200, rows);
        if (req.method === "POST") {
          if (table === "email_events") {
            events.push({ ...body, created_at: new Date().toISOString() });
            return send(res, 201, []);
          }
          if (table === "invites") {
            if (bearer !== "tok-alice")
              return send(res, 403, {
                code: "42501",
                message: "row-level security",
              });
            const row = {
              id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              token: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
              email: body.email,
            };
            return single ? send(res, 201, row) : send(res, 201, [row]);
          }
          return send(res, 201, []);
        }
        if (table === "email_events") {
          let want: any[] = [];
          const cs = q.get("tags");
          if (cs && cs.startsWith("cs.")) {
            try {
              want = JSON.parse(cs.slice(3));
            } catch {
              return send(res, 400, { error: "bad containment filter" });
            }
          }
          return out(
            events.filter((e) => matchesTags(e.tags ?? [], want)).reverse(),
          );
        }
        if (table === "users") {
          const id = (q.get("id") ?? "").replace("eq.", "");
          const u = [ALICE, BOB, CAROL].find((x) => x.id === id);
          return out([
            {
              role: u?.id === BOB.id ? "founder" : "investor",
              full_name: u?.name ?? "",
            },
          ]);
        }
        if (table === "deal_room_members") {
          return out([
            { user_id: ALICE.id, role: "investor" },
            { user_id: BOB.id, role: "founder" },
          ]);
        }
        if (table === "deal_rooms")
          return out([{ startups: { company_name: "Example Co" } }]);
        if (table === "startups")
          return out([{ founder_id: ALICE.id, company_name: "Example Co" }]);
        if (table === "startup_team_accounts") return out([]);
        if (table === "team_invites") {
          const tok = (q.get("token") ?? "").replace("eq.", "");
          const base = {
            startup_id: STARTUP,
            investor_profile_id: null,
            role: "analyst",
            accepted_at: null,
            expires_at: "2099-01-01T00:00:00Z",
          };
          if (tok === OWN_TEAM_TOKEN)
            return out([
              {
                ...base,
                id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                email: INVITEE,
                invited_by: ALICE.id,
                token: tok,
              },
            ]);
          if (tok === FOREIGN_TEAM_TOKEN)
            return out([
              {
                ...base,
                id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                email: "other@example.invalid",
                invited_by: BOB.id,
                token: tok,
              },
            ]);
          return out([]);
        }
        if (table === "deal_room_lawyer_invites") {
          const tok = (q.get("token") ?? "").replace("eq.", "");
          const base = {
            deal_room_id: ROOM,
            side: "investor",
            accepted_at: null,
            expires_at: "2099-01-01T00:00:00Z",
          };
          if (tok === OWN_LAWYER_TOKEN)
            return out([
              {
                ...base,
                id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                email: LAWYER,
                invited_by: ALICE.id,
                token: tok,
              },
            ]);
          if (tok === FOREIGN_LAWYER_TOKEN)
            return out([
              {
                ...base,
                id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
                email: "other2@example.invalid",
                invited_by: BOB.id,
                token: tok,
              },
            ]);
          return out([]);
        }
        return out([]);
      }
      send(res, 404, { error: "unmocked", path: p });
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    hits,
    events,
    reset() {
      hits.resend = hits.hubspot = hits.notion = hits.auth = 0;
      hits.resendBodies = [];
      hits.sentTo.length = 0;
      hits.hubspotBodies.length = 0;
      hits.notionBodies.length = 0;
      events.length = 0;
    },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
