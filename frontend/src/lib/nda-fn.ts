import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export interface NdaSigner {
  user_id: string;
  full_name: string;
  company: string;
  role: string;
  accepted_at: string;
}

export interface NdaDocument {
  id: string;
  deal_room_id: string;
  nda_text: string;
  version: number;
  created_at: string;
  updated_at: string;
}

function formatSignerRole(role: string): string {
  if (role === "founder") return "Founder / Company Representative";
  if (role === "investor") return "Investor / Recipient";
  if (role === "lawyer") return "Legal Counsel";
  if (role === "analyst") return "Analyst";
  if (role === "viewer") return "Observer";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function buildMultiPartyNdaText(
  companyName: string,
  legalEntityName: string | null,
  incorporatedIn: string | null,
  signers: NdaSigner[],
  generatedAt: string,
): string {
  const displayCompany = legalEntityName || companyName;
  const founderSigner = signers.find((s) => s.role === "founder");
  const otherSigners = signers.filter((s) => s.role !== "founder");

  const partiesBlock = signers
    .map((s) => {
      const lines = [
        `  Name:    ${s.full_name}`,
        `  Company: ${s.company || "—"}`,
        `  Role:    ${formatSignerRole(s.role)}`,
        `  Signed:  ${formatTs(s.accepted_at)}`,
      ];
      return lines.join("\n");
    })
    .join("\n\n");

  const signatoriesBlock = signers
    .map(
      (s, i) =>
        `Party ${i + 1}: ${s.full_name} (${formatSignerRole(s.role)})\n` +
        `  Company:    ${s.company || "—"}\n` +
        `  Accepted:   ${formatTs(s.accepted_at)}\n` +
        `  Electronic signature confirmed via Hockystick platform`,
    )
    .join("\n\n");

  const incorporationLine =
    incorporatedIn
      ? `incorporated in ${incorporatedIn}`
      : "a registered entity";

  return `MUTUAL NON-DISCLOSURE AGREEMENT

Document reference: Deal Room NDA
Generated: ${generatedAt}
Parties: ${signers.length}

— — —

PARTIES TO THIS AGREEMENT

${partiesBlock}

— — —

1. PURPOSE

The parties to this Agreement wish to explore a potential investment relationship involving ${displayCompany} (${incorporationLine}). In connection with this evaluation, each party may disclose certain non-public, confidential, or proprietary information to the other.

2. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any non-public information relating to the actual or anticipated business, research, or development of the disclosing party, including but not limited to: financial data and projections, business plans, customer lists, intellectual property, technical specifications, product roadmaps, pricing strategies, personnel information, and any documents shared within this deal room.

3. OBLIGATIONS OF RECEIVING PARTY

Each Recipient agrees to:
(a) Hold all Confidential Information in strict confidence;
(b) Not disclose any Confidential Information to third parties without prior written consent from the disclosing party;
(c) Use the Confidential Information solely for the purpose of evaluating the Transaction;
(d) Protect the Confidential Information using at least the same degree of care applied to its own confidential information, but in no event less than reasonable care, and in any event no less than the standard of care that a prudent person would exercise to protect their own trade secrets.

4. EXCEPTIONS

These obligations do not apply to information that:
(a) Is or becomes publicly known through no breach of this Agreement;
(b) Was rightfully known to the Recipient prior to disclosure;
(c) Is independently developed by the Recipient without use of Confidential Information;
(d) Is required to be disclosed by applicable law or valid court order, provided the Recipient gives prompt notice where permitted by law, and provide reasonable prior notice to the disclosing party where legally permitted to allow them to seek a protective order.

5. MONITORING AND WATERMARKING

All materials accessed via the Hockystick deal room are electronically watermarked and access-logged. Activity within the deal room is monitored. Any breach of this Agreement may result in immediate revocation of access and legal action.

6. TERM

This Agreement remains in effect for three (3) years from the date of first execution by each respective party. All confidentiality obligations survive termination.

7. RETURN OR DESTRUCTION OF INFORMATION

Upon written request, each Recipient shall promptly return or destroy all Confidential Information and certify such action in writing.

8. NO LICENSE

Nothing herein grants any Recipient any rights in or to the Confidential Information except as expressly set forth.

9. GOVERNING LAW AND DISPUTE RESOLUTION

9.1 Governing Law
This Agreement and any disputes arising out of or in connection with it shall be governed by and construed in accordance with the laws of the Dubai International Financial Centre (DIFC), United Arab Emirates, without regard to its conflict of laws provisions.

9.2 Dispute Resolution — Negotiation
The parties shall first attempt to resolve any dispute, controversy, or claim arising out of or relating to this Agreement through good-faith negotiation for a period of thirty (30) days following written notice of the dispute.

9.3 Arbitration
If the dispute is not resolved through negotiation, it shall be finally settled by binding arbitration under the Rules of the Dubai International Arbitration Centre (DIAC), which rules are deemed incorporated by reference into this clause. The number of arbitrators shall be one (1) for claims below USD 500,000 and three (3) for claims of USD 500,000 or above. The seat of arbitration shall be Dubai, UAE. The language of arbitration shall be English.

9.4 Emergency Relief
Notwithstanding the foregoing, either party may seek interim or emergency injunctive relief from any court of competent jurisdiction to prevent irreparable harm pending the constitution of the arbitral tribunal. Seeking such relief shall not be deemed a waiver of the right to arbitrate.

9.5 International Parties
The parties expressly agree that the United Nations Convention on Contracts for the International Sale of Goods (CISG) shall not apply to this Agreement. For parties domiciled outside the UAE, this Agreement shall be enforceable in their home jurisdiction to the maximum extent permitted by applicable local law, and the parties waive any objection to the arbitral seat on grounds of inconvenience.

9.6 Recognition and Enforcement
The parties agree that any arbitral award rendered under this clause shall be final and binding, and may be entered as a judgment in any court of competent jurisdiction. Enforcement of awards shall be subject to the New York Convention on the Recognition and Enforcement of Foreign Arbitral Awards (1958), to which the UAE is a signatory.

10. ENTIRE AGREEMENT

This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements, whether oral or written. This is a living document — it is updated each time a new party accepts these terms. All prior acceptances remain in full force.

— — —

SIGNATORIES

${signatoriesBlock}

— — —

This agreement is executed electronically via Hockystick. Each party has indicated acceptance by checking the acknowledgement box and clicking "Accept & Enter Deal Room" on the Hockystick platform. Each acceptance is timestamped, logged with the accepting party's browser user-agent string, and stored immutably.

Company: ${displayCompany}${founderSigner ? `\nFounder representative: ${founderSigner.full_name}` : ""}
Total parties bound: ${signers.length}
Last updated: ${generatedAt}`;
}

export const generateNdaDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { dealRoomId: string })
  .handler(async ({ data }): Promise<NdaDocument | null> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const serviceKey =
      cfEnv.SUPABASE_SERVICE_ROLE_KEY ||
      cfEnv.SUPABASE_SERVICE_KEY ||
      "";
    const supabaseUrl =
      cfEnv.SUPABASE_URL ||
      cfEnv.VITE_SUPABASE_URL ||
      "https://ldimninnjlvxozubheib.supabase.co";

    if (!serviceKey) {
      console.error("[nda-fn] No service role key — cannot generate NDA document");
      return null;
    }

    const svc = createClient(supabaseUrl, serviceKey);
    const { dealRoomId } = data;

    // 1. Fetch all acceptances for this room (service key bypasses nda_own row-level isolation)
    const { data: acceptances, error: accErr } = await svc
      .from("nda_acceptances")
      .select("user_id, signer_full_name, signer_company, role, accepted_at")
      .eq("deal_room_id", dealRoomId)
      .order("accepted_at", { ascending: true });

    if (accErr || !acceptances?.length) {
      console.error("[nda-fn] No acceptances found:", accErr);
      return null;
    }

    // 2. Fetch deal room → startup
    const { data: room, error: roomErr } = await svc
      .from("deal_rooms")
      .select("startup_id, investor_name")
      .eq("id", dealRoomId)
      .single();

    if (roomErr || !room) {
      console.error("[nda-fn] Deal room not found:", roomErr);
      return null;
    }

    const { data: startup, error: startupErr } = await svc
      .from("startups")
      .select("company_name, legal_entity_name, incorporated_in")
      .eq("id", room.startup_id)
      .maybeSingle();

    if (startupErr) console.warn("[nda-fn] Startup fetch error:", startupErr);

    const companyName = startup?.company_name ?? "the Company";
    const legalEntityName = startup?.legal_entity_name ?? null;
    const incorporatedIn = startup?.incorporated_in ?? null;

    const signers: NdaSigner[] = acceptances.map((a) => ({
      user_id: a.user_id,
      full_name: a.signer_full_name || "Unknown",
      company: a.signer_company || "",
      role: a.role,
      accepted_at: a.accepted_at,
    }));

    const generatedAt = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    const ndaText = buildMultiPartyNdaText(
      companyName,
      legalEntityName,
      incorporatedIn,
      signers,
      generatedAt,
    );

    // 3. Upsert — increment version on update
    const { data: existing } = await svc
      .from("nda_documents")
      .select("id, version")
      .eq("deal_room_id", dealRoomId)
      .maybeSingle();

    const newVersion = (existing?.version ?? 0) + 1;

    const { data: doc, error: upsertErr } = await svc
      .from("nda_documents")
      .upsert(
        {
          deal_room_id: dealRoomId,
          nda_text: ndaText,
          version: newVersion,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "deal_room_id" },
      )
      .select()
      .single();

    if (upsertErr) {
      console.error("[nda-fn] Upsert error:", upsertErr);
      return null;
    }

    return doc as NdaDocument;
  });

// Admin helper — regenerate the canonical NDA document for any deal room.
// Usage from browser console (must be signed in as a deal room member):
//   import('/src/lib/nda-fn.ts').then(m => m.regenerateNdaForRoom({ data: { dealRoomId: '<uuid>' } }).then(console.log))
// Or call via the server fn directly in any server context.
export const regenerateNdaForRoom = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { dealRoomId: string })
  .handler(async ({ data }): Promise<{ ok: boolean; version?: number; error?: string }> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const serviceKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY || cfEnv.SUPABASE_SERVICE_KEY || "";
    const supabaseUrl = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
    if (!serviceKey) return { ok: false, error: "no service key" };

    // Reuse the same generation logic as generateNdaDocument by calling it via internal import.
    // We duplicate the minimal fetch+upsert here to keep this self-contained for admin use.
    const svc = createClient(supabaseUrl, serviceKey);
    const { dealRoomId } = data;

    const { data: acceptances } = await svc
      .from("nda_acceptances")
      .select("user_id, signer_full_name, signer_company, role, accepted_at")
      .eq("deal_room_id", dealRoomId)
      .order("accepted_at", { ascending: true });

    if (!acceptances?.length) return { ok: false, error: "no acceptances found for this deal room" };

    const { data: room } = await svc.from("deal_rooms").select("startup_id").eq("id", dealRoomId).single();
    if (!room) return { ok: false, error: "deal room not found" };

    const { data: startup } = await svc
      .from("startups")
      .select("company_name, legal_entity_name, incorporated_in")
      .eq("id", room.startup_id)
      .maybeSingle();

    const signers: NdaSigner[] = acceptances.map((a) => ({
      user_id: a.user_id,
      full_name: a.signer_full_name || "Unknown",
      company: a.signer_company || "",
      role: a.role,
      accepted_at: a.accepted_at,
    }));

    const generatedAt = new Date().toLocaleString("en-US", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", timeZoneName: "short",
    });

    const ndaText = buildMultiPartyNdaText(
      startup?.company_name ?? "the Company",
      startup?.legal_entity_name ?? null,
      startup?.incorporated_in ?? null,
      signers,
      generatedAt,
    );

    const { data: existing } = await svc.from("nda_documents").select("id, version").eq("deal_room_id", dealRoomId).maybeSingle();
    const newVersion = (existing?.version ?? 0) + 1;

    const { data: doc, error: upsertErr } = await svc
      .from("nda_documents")
      .upsert({ deal_room_id: dealRoomId, nda_text: ndaText, version: newVersion, updated_at: new Date().toISOString() }, { onConflict: "deal_room_id" })
      .select()
      .single();

    if (upsertErr) return { ok: false, error: upsertErr.message };
    console.log(`[nda-fn] regenerateNdaForRoom: deal room ${dealRoomId} → v${(doc as any).version}`);
    return { ok: true, version: (doc as any).version };
  });

export const fetchNdaDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { dealRoomId: string })
  .handler(async ({ data }): Promise<NdaDocument | null> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const serviceKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY || cfEnv.SUPABASE_SERVICE_KEY || "";
    const supabaseUrl = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";

    if (!serviceKey) return null;

    const svc = createClient(supabaseUrl, serviceKey);
    const { data: doc, error } = await svc
      .from("nda_documents")
      .select("*")
      .eq("deal_room_id", data.dealRoomId)
      .maybeSingle();

    if (error) {
      console.error("[nda-fn] fetchNdaDocument error:", error);
      return null;
    }
    return doc as NdaDocument | null;
  });
