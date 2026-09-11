import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Loader2, Lock, Check, Upload, Download, AlertTriangle, FileText, DollarSign, PenLine, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { calculateFee, formatUsd, feeBasisLabel } from "@/lib/fee-schedule";
import { StatusLabel } from "@/components/v2";
import {
  setFee, confirmFeePayment, recordSignedAgreement,
  uploadPaymentProof, reviewPaymentProof, confirmDeliverable, downloadAgreement,
} from "@/lib/closing-fn";

// R15C — the closing pipeline (Gates 4-7). Sole content of the deal room's
// /close route. Principals only (founder/investor) — LawyerRoomView never renders
// this and RLS gives the lawyer 0 rows. Once the room is closed it is a read-only
// archive (isClosed short-circuits every action).
//
// Restyled to v2 tokens per CLAUDE.md §0a against Figma frames 35:9378
// ("Signing (Gate 4)"), 35:9560 ("Payment (Gate 5)"), 35:9172 ("Final
// Close (Gate 6)") — the same "Closing Sequence" frame family as
// close.tsx/LawyerGate.tsx. Real gate count/order/content stayed
// authoritative (4 real gates: fee, sign, payment, close — not the
// frames' own 6-gate numbering, which includes counsel and agreement,
// already covered elsewhere in this route). Extracted only the
// transferable visual grammar: the solid/dashed status-badge pair
// (35:9378's "Signed"/"Pending" pill treatment, now StatusLabel),
// the dashed-border upload-slot pattern (35:9560), the checkbox +
// monospace-amount confirmation copy (35:9560's founder-confirms-funds
// block), and the red "Irreversible Action" panel with a Principal A/B
// pending-pair for the mutual-close step (35:9172). NOT ported: any of
// the three frames' own page chrome (SideNavBar, "Capital
// Flow"/"Capital Systems"/"Worklist" nav, search bar, LND-8492 ticket
// IDs, PDF viewer canvas, prerequisite-checklist table) — none of it
// exists as a concept in this component, and none of it is this
// component's job (it renders inside the real AppShell). "Reference
// ID"/timestamp-audit-row styling from 35:9172's checklist was also not
// ported — no per-gate reference number exists yet (CLAUDE.md §20.6:
// reference numbering lands on deal_rooms, not sub-gates).

const BORDER = "var(--v2-rule)", INK = "var(--v2-ink)", INK2 = "var(--v2-ink-secondary)", INK3 = "var(--v2-ink-muted)", BRAND = "var(--v2-accent)";
const GREEN = "var(--v2-satisfied)", AMBER = "var(--v2-attention)";

async function token() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export function ClosingPipeline({
  dealRoomId, role, userId, isClosed, closedAt,
}: {
  dealRoomId: string;
  role: "founder" | "investor";
  userId: string;
  isClosed: boolean;
  closedAt: string | null;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  // ── queries: finalized agreement, fee, signed, payment proof, close, terms ──
  const { data: agreement } = useQuery({
    queryKey: ["closing-agreement", dealRoomId], enabled: !!dealRoomId,
    queryFn: async () => (await supabase.from("deal_room_agreements").select("*").eq("deal_room_id", dealRoomId).eq("status", "accepted").maybeSingle()).data,
  });
  const { data: fee } = useQuery({
    queryKey: ["closing-fee", dealRoomId], enabled: !!dealRoomId,
    queryFn: async () => (await supabase.from("deal_room_fees").select("*").eq("deal_room_id", dealRoomId).maybeSingle()).data,
  });
  const { data: signed } = useQuery({
    queryKey: ["closing-signed", dealRoomId], enabled: !!dealRoomId,
    queryFn: async () => (await supabase.from("deal_room_signed_agreements").select("*").eq("deal_room_id", dealRoomId).maybeSingle()).data,
  });
  const { data: proofs = [] } = useQuery({
    queryKey: ["closing-proofs", dealRoomId], enabled: !!dealRoomId,
    queryFn: async () => (await supabase.from("deal_room_payment_proof").select("*").eq("deal_room_id", dealRoomId).order("version", { ascending: false })).data ?? [],
  });
  const { data: close } = useQuery({
    queryKey: ["closing-close", dealRoomId], enabled: !!dealRoomId,
    queryFn: async () => (await supabase.from("deal_room_close").select("*").eq("deal_room_id", dealRoomId).maybeSingle()).data,
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["closing-invoices", dealRoomId], enabled: !!dealRoomId,
    queryFn: async () => (await supabase.from("deal_room_invoices").select("*").eq("deal_room_id", dealRoomId)).data ?? [],
  });
  const { data: lockedTerms = [] } = useQuery({
    queryKey: ["closing-terms", dealRoomId], enabled: !!dealRoomId,
    queryFn: async () => (await supabase.from("deal_room_terms").select("term_key,term_label,current_value").eq("deal_room_id", dealRoomId).eq("status", "locked")).data ?? [],
  });

  // realtime
  useEffect(() => {
    if (!dealRoomId) return;
    const inv = () => ["closing-fee", "closing-signed", "closing-proofs", "closing-close", "closing-invoices", "deal-room"].forEach((k) => qc.invalidateQueries({ queryKey: [k, dealRoomId] }));
    const ch = supabase.channel(`closing-${dealRoomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_fees", filter: `deal_room_id=eq.${dealRoomId}` }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_signed_agreements", filter: `deal_room_id=eq.${dealRoomId}` }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_payment_proof", filter: `deal_room_id=eq.${dealRoomId}` }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_close", filter: `deal_room_id=eq.${dealRoomId}` }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_rooms", filter: `id=eq.${dealRoomId}` }, inv)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [dealRoomId, qc]);

  const refresh = () => ["closing-agreement", "closing-fee", "closing-signed", "closing-proofs", "closing-close", "closing-invoices", "deal-room"].forEach((k) => qc.invalidateQueries({ queryKey: [k, dealRoomId] }));

  // ── derived gate state ──
  const feeConfirmed = !!fee && ["beta_bypass", "paid", "waived"].includes(fee.payment_status);
  const bothSigned = !!signed?.founder_storage_path && !!signed?.investor_storage_path;
  const latestProof = (proofs as any[])[0];
  const paymentConfirmed = (proofs as any[]).some((p) => p.founder_status === "confirmed");
  const myClose = role === "founder" ? close?.founder_confirmed : close?.investor_confirmed;
  const theirClose = role === "founder" ? close?.investor_confirmed : close?.founder_confirmed;

  // ── fee form state ──
  const prefillAmount = useMemo(() => {
    const cap = (lockedTerms as any[]).find((t) => ["valuation_cap", "pre_money_valuation", "purchase_price", "principal_amount"].includes(t.term_key));
    if (cap?.current_value) { const n = Number(String(cap.current_value).replace(/[^0-9.]/g, "")); if (n > 0) return String(n); }
    return "";
  }, [lockedTerms]);
  const [amountInput, setAmountInput] = useState("");
  const [feePayer, setFeePayer] = useState<"founder" | "investor">("founder");
  useEffect(() => { if (!fee && prefillAmount && !amountInput) setAmountInput(prefillAmount); }, [prefillAmount, fee]);
  const previewFee = calculateFee(Number(amountInput.replace(/[^0-9.]/g, "")) || 0);

  // ── actions ──
  const download = async (path: string) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank"); else toast.error("Could not open file");
  };
  const uploadTo = async (file: File, subdir: string) => {
    const path = `${dealRoomId}/${subdir}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("documents").upload(path, file);
    if (error) throw error;
    return path;
  };

  const doSetFee = async () => {
    const amt = Number(amountInput.replace(/[^0-9.]/g, ""));
    if (!(amt > 0)) { toast.error("Enter the deal amount"); return; }
    setBusy("setfee");
    try {
      const r = await setFee({ data: { dealRoomId, accessToken: await token(), dealAmount: amt, feePayer, instrumentType: (lockedTerms as any[])[0] ? undefined : undefined } });
      if (!r.ok) { toast.error(r.error === "founder_only" ? "Only the founder sets the fee" : "Could not set fee"); return; }
      toast.success("Fee confirmed"); refresh();
    } catch { toast.error("Could not set fee"); } finally { setBusy(null); }
  };
  const doConfirmPayment = async () => {
    setBusy("payfee");
    try {
      const r = await confirmFeePayment({ data: { dealRoomId, accessToken: await token() } });
      if (!r.ok) { toast.error(r.error === "not_the_payer" ? "Only the designated payer can confirm" : "Could not confirm"); return; }
      toast.success("Fee recorded"); refresh();
    } catch { toast.error("Could not confirm"); } finally { setBusy(null); }
  };
  const doUploadSigned = async (file: File) => {
    setBusy("signed");
    try {
      const path = await uploadTo(file, "signed");
      const r = await recordSignedAgreement({ data: { dealRoomId, accessToken: await token(), storagePath: path, fileName: file.name } });
      if (!r.ok) { toast.error("Could not record signed copy"); return; }
      toast.success("Signed copy uploaded"); refresh();
    } catch { toast.error("Upload failed"); } finally { setBusy(null); }
  };
  const doUploadProof = async (file: File) => {
    setBusy("proof");
    try {
      const path = await uploadTo(file, "payment-proof");
      const r = await uploadPaymentProof({ data: { dealRoomId, accessToken: await token(), storagePath: path, fileName: file.name } });
      if (!r.ok) { toast.error(r.error === "not_both_signed" ? "Both signed copies needed first" : "Could not upload proof"); return; }
      toast.success(`Payment proof v${r.version} uploaded`); refresh();
    } catch { toast.error("Upload failed"); } finally { setBusy(null); }
  };
  const [discOpen, setDiscOpen] = useState(false);
  const [discText, setDiscText] = useState("");
  const doReviewProof = async (proofId: string, confirm: boolean) => {
    if (!confirm && !discText.trim()) { toast.error("A comment is required"); return; }
    setBusy("review");
    try {
      const r = await reviewPaymentProof({ data: { dealRoomId, accessToken: await token(), proofId, confirm, comment: confirm ? undefined : discText.trim() } });
      if (!r.ok) { toast.error("Could not submit"); return; }
      setDiscOpen(false); setDiscText(""); toast.success(confirm ? "Payment receipt confirmed" : "Discrepancy flagged"); refresh();
    } catch { toast.error("Could not submit"); } finally { setBusy(null); }
  };
  const doConfirmClose = async () => {
    setBusy("close");
    try {
      const r = await confirmDeliverable({ data: { dealRoomId, accessToken: await token() } });
      if (!r.ok) { toast.error(r.error === "payment_not_confirmed" ? "Payment must be confirmed first" : "Could not confirm"); return; }
      if (r.closed) toast.success("Deal closed — invoices generated"); else toast.success("Your confirmation recorded — awaiting counterparty");
      refresh();
    } catch { toast.error("Could not confirm"); } finally { setBusy(null); }
  };

  if (!agreement) {
    return (
      <div className="border bg-v2-panel px-5 py-6 text-sm" style={{ borderColor: BORDER, borderRadius: "var(--v2-radius)", color: INK2 }}>
        The closing pipeline unlocks once the agreement is finalized (both parties accepted it in the Term Sheet stage).
      </div>
    );
  }

  const step = (n: number, title: string, done: boolean, active: boolean, children: React.ReactNode, icon: React.ReactNode) => (
    <div className="border bg-v2-panel" style={{ borderColor: done ? GREEN : BORDER, borderRadius: "var(--v2-radius)" }}>
      <div className="flex items-center gap-2.5 border-b px-5 py-3.5" style={{ borderColor: done ? "var(--v2-satisfied-wash)" : BORDER }}>
        <div className="grid h-6 w-6 place-items-center text-[11px] font-semibold text-white" style={{ background: done ? GREEN : active ? BRAND : INK3, borderRadius: "var(--v2-radius)" }}>
          {done ? <Check className="h-3.5 w-3.5" /> : n}
        </div>
        <span className="font-v2-ui text-sm font-semibold" style={{ color: INK }}>{title}</span>
        <span className="ml-auto">{icon}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {isClosed && (
        <div className="flex items-center gap-3 border p-4" style={{ borderColor: GREEN, background: "var(--v2-satisfied-wash)", borderRadius: "var(--v2-radius)" }}>
          <Lock className="h-5 w-5 shrink-0" style={{ color: GREEN }} />
          <div>
            <div className="text-sm font-semibold" style={{ color: GREEN }}>Deal closed — {closedAt ? new Date(closedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}</div>
            <div className="text-xs" style={{ color: INK2 }}>This deal room is a read-only archive. All content is preserved and downloadable; nothing can be changed.</div>
          </div>
        </div>
      )}

      {/* GATE 4 — fee + who-pays + payment placeholder */}
      {step(4, "Platform fee", feeConfirmed, !feeConfirmed, (
        <div className="space-y-4">
          {!fee ? (
            role === "founder" ? (
              <>
                <p className="text-[13px]" style={{ color: INK2 }}>Confirm the closed deal amount. The Lengdon success fee ({feeBasisLabel(Number(amountInput.replace(/[^0-9.]/g, "")) || 0)}) is calculated from it. You also choose who pays the platform fee.</p>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-[12px] font-medium" style={{ color: INK2 }}>Deal amount (USD)</label>
                    <input value={amountInput} onChange={(e) => setAmountInput(e.target.value)} placeholder="e.g. 500000"
                      className="mt-1 w-48 border px-3 text-sm outline-none" style={{ borderColor: BORDER, color: INK, height: 36, borderRadius: "var(--v2-radius)" }} />
                    {prefillAmount && <div className="mt-1 text-[11px]" style={{ color: INK3 }}>Pre-filled from locked terms — confirm or edit.</div>}
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium" style={{ color: INK2 }}>Platform fee</label>
                    <div className="mt-1 text-lg font-semibold tabular-nums" style={{ color: BRAND }}>{formatUsd(previewFee)}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium" style={{ color: INK2 }}>Who pays the platform fee?</label>
                  <div className="mt-1.5 flex gap-2">
                    {(["founder", "investor"] as const).map((p) => (
                      <button key={p} onClick={() => setFeePayer(p)}
                        className="border px-3 text-xs font-medium capitalize" style={{ borderColor: feePayer === p ? BRAND : BORDER, color: feePayer === p ? BRAND : INK2, background: feePayer === p ? "var(--v2-accent-wash)" : "var(--v2-panel)", height: 32, borderRadius: "var(--v2-radius)" }}>
                        {p} pays
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={doSetFee} disabled={busy === "setfee" || isClosed}
                  className="inline-flex items-center gap-1.5 px-4 text-xs font-medium text-white disabled:opacity-50" style={{ background: BRAND, height: 36, borderRadius: "var(--v2-radius)" }}>
                  {busy === "setfee" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5" />} Confirm fee & who pays
                </button>
              </>
            ) : <p className="text-[13px]" style={{ color: INK2 }}>Awaiting the founder to confirm the deal amount and platform fee.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                <Row label="Deal amount" value={formatUsd(Number(fee.deal_amount))} />
                <Row label="Platform fee" value={formatUsd(Number(fee.calculated_fee))} brand />
                <Row label="Fee paid by" value={String(fee.fee_payer)} cap />
                <Row label="Status" value={feeConfirmed ? "Confirmed (beta)" : "Awaiting payment"} />
              </div>
              {!feeConfirmed && role === fee.fee_payer && (
                <div className="border p-4" style={{ borderColor: BORDER, background: "var(--v2-surface)", borderRadius: "var(--v2-radius)" }}>
                  <div className="text-[13px] font-medium" style={{ color: INK }}>Confirm payment of the {formatUsd(Number(fee.calculated_fee))} platform fee</div>
                  {/* TODO(stripe): placeholder — no real charge in beta. */}
                  <p className="mt-1 text-[12px]" style={{ color: INK2 }}>Payment processing coming soon — confirming records the fee so the closing can proceed. Your deal closing is recorded and your agreement is preserved.</p>
                  <button onClick={doConfirmPayment} disabled={busy === "payfee" || isClosed}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 text-xs font-medium text-white disabled:opacity-50" style={{ background: BRAND, height: 36, borderRadius: "var(--v2-radius)" }}>
                    {busy === "payfee" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirm payment (beta)
                  </button>
                </div>
              )}
              {!feeConfirmed && role !== fee.fee_payer && (
                <div className="border p-3 text-[13px]" style={{ borderColor: "var(--v2-attention)", background: "var(--v2-attention-wash)", borderRadius: "var(--v2-radius)", color: AMBER }}>
                  You are the designated payer of the platform fee ({formatUsd(Number(fee.calculated_fee))}). — This shows for the payer. Awaiting {fee.fee_payer} to confirm.
                </div>
              )}
            </div>
          )}
        </div>
      ), <DollarSign className="h-4 w-4" style={{ color: feeConfirmed ? GREEN : INK3 }} />)}

      {/* GATE 5 — download + signing */}
      {step(5, "Download & sign", bothSigned, feeConfirmed && !bothSigned, (
        <div className="space-y-3">
          {!feeConfirmed ? (
            <p className="text-[13px]" style={{ color: INK3 }}>Download unlocks once the platform fee is confirmed.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={async () => {
                  const r = await downloadAgreement({ data: { dealRoomId, accessToken: await token(), agreementId: agreement.id } });
                  if (r.ok && r.url) window.open(r.url, "_blank");
                  else toast.error(r.error === "fee_not_confirmed" ? "Confirm the platform fee first" : "Could not download");
                }}
                  className="inline-flex items-center gap-1.5 px-3 text-xs font-medium text-white" style={{ background: BRAND, height: 32, borderRadius: "var(--v2-radius)" }}>
                  <Download className="h-3.5 w-3.5" /> Download agreement
                </button>
                <span className="text-[12px]" style={{ color: INK3 }}>Sign externally, then upload your signed copy.</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <SignSlot label="Founder signed copy" done={!!signed?.founder_storage_path} name={signed?.founder_file_name}
                  canUpload={role === "founder" && !isClosed} onUpload={doUploadSigned} onDownload={() => signed?.founder_storage_path && download(signed.founder_storage_path)} busy={busy === "signed"} />
                <SignSlot label="Investor signed copy" done={!!signed?.investor_storage_path} name={signed?.investor_file_name}
                  canUpload={role === "investor" && !isClosed} onUpload={doUploadSigned} onDownload={() => signed?.investor_storage_path && download(signed.investor_storage_path)} busy={busy === "signed"} />
              </div>
            </>
          )}
        </div>
      ), <PenLine className="h-4 w-4" style={{ color: bothSigned ? GREEN : INK3 }} />)}

      {/* GATE 6 — investment payment */}
      {step(6, "Investment payment", paymentConfirmed, bothSigned && !paymentConfirmed, (
        <div className="space-y-3">
          {!bothSigned ? (
            <p className="text-[13px]" style={{ color: INK3 }}>Both signed copies are needed before the payment step.</p>
          ) : (
            <>
              <p className="text-[13px]" style={{ color: INK2 }}>The investor processes the deal payment externally (wire, etc.) and uploads proof. The founder confirms receipt.</p>
              {role === "investor" && !paymentConfirmed && !isClosed && (
                <label className="inline-flex cursor-pointer items-center gap-1.5 px-3 text-xs font-medium text-white" style={{ background: BRAND, height: 32, borderRadius: "var(--v2-radius)" }}>
                  {busy === "proof" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload payment proof{(proofs as any[]).length ? " (new version)" : ""}
                  <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg" disabled={busy === "proof"} onChange={(e) => { const f = e.target.files?.[0]; if (f) doUploadProof(f); e.target.value = ""; }} />
                </label>
              )}
              {(proofs as any[]).map((p) => (
                <div key={p.id} className="border-b last:border-b-0 py-2" style={{ borderColor: BORDER }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium" style={{ color: INK }}>v{p.version} · {p.file_name}</span>
                    <StatusLabel tone={p.founder_status === "confirmed" ? "satisfied" : p.founder_status === "discrepancy" ? "adverse" : "attention"}>
                      {p.founder_status === "confirmed" ? "Confirmed" : p.founder_status === "discrepancy" ? "Discrepancy" : "Awaiting review"}
                    </StatusLabel>
                    <button onClick={() => download(p.storage_path)} className="text-[12px] underline" style={{ color: INK3 }}>download</button>
                    <span className="ml-auto text-[12px]" style={{ color: INK3 }}>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                  </div>
                  {p.discrepancy_comment && <div className="mt-1 text-[12px]" style={{ color: AMBER }}>Founder flagged: {p.discrepancy_comment}</div>}
                  {role === "founder" && p.id === latestProof?.id && p.founder_status !== "confirmed" && !isClosed && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button onClick={() => doReviewProof(p.id, true)} disabled={busy === "review"} className="inline-flex items-center gap-1 px-3 text-xs font-medium text-white" style={{ background: BRAND, height: 30, borderRadius: "var(--v2-radius)" }}>Confirm receipt</button>
                      <button onClick={() => setDiscOpen(true)} className="border px-3 text-xs font-medium" style={{ borderColor: "var(--v2-attention)", color: AMBER, height: 30, borderRadius: "var(--v2-radius)" }}>Flag discrepancy</button>
                    </div>
                  )}
                  {discOpen && role === "founder" && p.id === latestProof?.id && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input value={discText} onChange={(e) => setDiscText(e.target.value)} placeholder="What's wrong with the payment?" className="min-w-[240px] flex-1 border px-3 text-sm outline-none" style={{ borderColor: BORDER, color: INK, height: 34, borderRadius: "var(--v2-radius)" }} />
                      <button onClick={() => doReviewProof(p.id, false)} disabled={busy === "review"} className="px-3 text-xs font-medium text-white" style={{ background: "var(--v2-attention)", height: 34, borderRadius: "var(--v2-radius)" }}>Send flag</button>
                      <button onClick={() => { setDiscOpen(false); setDiscText(""); }} className="border px-3 text-xs" style={{ borderColor: BORDER, color: INK2, height: 34, borderRadius: "var(--v2-radius)" }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      ), <ShieldCheck className="h-4 w-4" style={{ color: paymentConfirmed ? GREEN : INK3 }} />)}

      {/* GATE 7 — mutual close */}
      {step(7, "Close the deal", isClosed, paymentConfirmed && !isClosed, (
        <div className="space-y-3">
          {!paymentConfirmed ? (
            <p className="text-[13px]" style={{ color: INK3 }}>The payment must be confirmed before closing.</p>
          ) : isClosed ? (
            <div className="space-y-3">
              <p className="text-[13px]" style={{ color: INK2 }}>Both parties confirmed. Invoices were generated.</p>
              <div className="space-y-1.5">
                {(invoices as any[]).map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2 text-[13px]">
                    <FileText className="h-3.5 w-3.5" style={{ color: BRAND }} />
                    <span style={{ color: INK }}>Invoice {inv.invoice_number}</span>
                    <span className="capitalize" style={{ color: INK3 }}>· to {inv.bill_to_role}</span>
                    {(inv.bill_to_role === role) && <InvoiceView invoice={inv} />}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <p className="text-[13px]" style={{ color: INK2 }}>
                {role === "investor" ? "Confirm you received the equity certificate / debt agreement / share transfer per the agreed instrument." : "Confirm you delivered the agreed instrument to the investor."}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <StatusLabel tone={close?.founder_confirmed ? "satisfied" : "attention"}>Founder {close?.founder_confirmed ? "confirmed" : "pending"}</StatusLabel>
                <StatusLabel tone={close?.investor_confirmed ? "satisfied" : "attention"}>Investor {close?.investor_confirmed ? "confirmed" : "pending"}</StatusLabel>
              </div>
              {!myClose ? (
                <button onClick={doConfirmClose} disabled={busy === "close"} className="inline-flex items-center gap-1.5 px-4 text-xs font-medium text-white disabled:opacity-50" style={{ background: BRAND, height: 36, borderRadius: "var(--v2-radius)" }}>
                  {busy === "close" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {role === "investor" ? "Confirm receipt" : "Confirm delivery"}
                </button>
              ) : (
                <span className="text-[12px]" style={{ color: INK3 }}>You confirmed · {theirClose ? "closing…" : "awaiting counterparty"}</span>
              )}
            </>
          )}
        </div>
      ), <Lock className="h-4 w-4" style={{ color: isClosed ? GREEN : INK3 }} />)}

      {/* Exit — see step 6 (ExitDeal) mounted by the route */}
    </div>
  );
}

function Row({ label, value, brand, cap }: { label: string; value: string; brand?: boolean; cap?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5" style={{ borderColor: BORDER }}>
      <span className="text-[12px]" style={{ color: INK3 }}>{label}</span>
      <span className={`text-[13px] font-medium ${cap ? "capitalize" : ""}`} style={{ color: brand ? BRAND : INK }}>{value}</span>
    </div>
  );
}
function SignSlot({ label, done, name, canUpload, onUpload, onDownload, busy }: { label: string; done: boolean; name?: string; canUpload: boolean; onUpload: (f: File) => void; onDownload: () => void; busy: boolean }) {
  return (
    <div className="border p-3" style={{ borderColor: done ? GREEN : BORDER, borderRadius: "var(--v2-radius)" }}>
      <div className="flex items-center gap-2">
        {done ? <Check className="h-4 w-4" style={{ color: GREEN }} /> : <div className="h-4 w-4 rounded-full border-2" style={{ borderColor: INK3 }} />}
        <span className="text-[13px] font-medium" style={{ color: INK }}>{label}</span>
      </div>
      {done ? (
        <div className="mt-1.5 flex items-center gap-2 text-[12px]"><span style={{ color: INK2 }}>{name}</span><button onClick={onDownload} className="underline" style={{ color: INK3 }}>download</button></div>
      ) : canUpload ? (
        <label
          className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed px-3 py-3 text-xs font-medium"
          style={{ borderColor: "var(--v2-rule)", color: INK2, borderRadius: "var(--v2-radius)" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span>Upload signed copy</span>
          <input type="file" className="sr-only" accept=".pdf" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
        </label>
      ) : (
        <div className="mt-1.5 text-[12px]" style={{ color: INK3 }}>Awaiting upload</div>
      )}
    </div>
  );
}
function InvoiceView({ invoice }: { invoice: any }) {
  const openInvoice = () => {
    const c = invoice.content || {};
    const money = (n: any) => n != null ? `$${Number(n).toLocaleString("en-US")}` : "—";
    const html = `<!doctype html><meta charset="utf-8"><title>${invoice.invoice_number}</title>
    <style>body{font-family:'DM Sans',system-ui,sans-serif;color:#0A0A0B;max-width:640px;margin:40px auto;padding:0 24px}h1{font-family:Syne,sans-serif;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px 0;border-bottom:1px solid #E4E4E7;font-size:13px}td:last-child{text-align:right;font-weight:600}.h{color:#71717A;font-weight:400}.brand{color:#7C3AED;font-weight:700}</style>
    <h1 class="brand">Lengdon</h1>
    <div style="color:#52525B;font-size:13px">Platform Success Fee Invoice</div>
    <table>
      <tr><td class="h">Invoice number</td><td>${invoice.invoice_number}</td></tr>
      <tr><td class="h">Billed to</td><td style="text-transform:capitalize">${invoice.bill_to_role} — ${(invoice.bill_to_role === "founder" ? (c.parties?.founder?.name ?? "") + (c.parties?.founder?.entity ? " · " + c.parties.founder.entity : "") : c.parties?.investor?.name) ?? ""}</td></tr>
      <tr><td class="h">Deal room reference</td><td>${c.deal_ref_short ?? c.deal_room_ref ?? "—"}</td></tr>
      <tr><td class="h">Deal amount</td><td>${money(c.deal_amount)}</td></tr>
      <tr><td class="h">Platform fee</td><td>${money(c.fee_amount)}</td></tr>
      <tr><td class="h">Fee paid by</td><td style="text-transform:capitalize">${c.fee_payer ?? "—"}</td></tr>
      <tr><td class="h">Payment confirmed</td><td>${c.payment_confirmed_at ? new Date(c.payment_confirmed_at).toLocaleDateString() : "—"}</td></tr>
      <tr><td class="h">Invoice date</td><td>${c.generated_at ? new Date(c.generated_at).toLocaleDateString() : "—"}</td></tr>
    </table>
    <p style="color:#71717A;font-size:12px;margin-top:24px">${c.note ?? ""}</p>`;
    const blob = new Blob([html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  };
  return <button onClick={openInvoice} className="ml-2 text-[12px] underline" style={{ color: BRAND }}>view / download</button>;
}
