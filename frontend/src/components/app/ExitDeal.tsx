import { useState } from "react";
import { LogOut } from "lucide-react";

// R15C step 6 — exit / abandon the closing at any gate. Exiting does NOT delete
// anything: the room preserves whatever state it reached and stays accessible
// (not archived, not read-only) so the parties could resume if they choose. No
// fee is charged for an unclosed deal. If the fee was already paid but the deal
// abandoned before close, that's a manual support case (hello@hockystick.app) —
// NOT an automatic refund. This component is UI-only: "abandoning" simply means a
// party stops proceeding; there is no destructive action, so it only surfaces the
// honest message + confirmation, and (when a fee was paid) the support path.

const BORDER = "#E4E4E7", INK = "#0A0A0B", INK2 = "#52525B", INK3 = "#71717A";

export function ExitDeal({ feeAlreadyPaid, isClosed }: { feeAlreadyPaid: boolean; isClosed: boolean }) {
  const [open, setOpen] = useState(false);
  if (isClosed) return null; // a closed deal cannot be exited — it's archived

  return (
    <div className="border bg-white p-4" style={{ borderColor: BORDER, borderRadius: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium" style={{ color: INK }}>Exit this closing</div>
          <div className="text-[12px]" style={{ color: INK3 }}>Either party can stop at any point. Nothing is deleted — the room is preserved and you can resume later.</div>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 border px-3 text-xs font-medium" style={{ borderColor: "#FCA5A5", color: "#991B1B", height: 32, borderRadius: 2 }}>
          <LogOut className="h-3.5 w-3.5" /> Exit deal
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md border bg-white p-6" style={{ borderColor: BORDER, borderRadius: 0 }}>
            <h3 className="text-base font-semibold" style={{ color: INK, fontFamily: "Syne, sans-serif" }}>Exit this closing?</h3>
            <p className="mt-2 text-sm" style={{ color: INK2 }}>
              Exiting stops the closing process. <strong>Nothing is deleted</strong> — all terms, the summary, the agreement, and any uploaded documents stay in the room, and either party can resume later. No platform fee is charged for a deal that doesn't close.
            </p>
            {feeAlreadyPaid && (
              <div className="mt-3 border p-3 text-[13px]" style={{ borderColor: "#F59E0B", background: "#FFFBEB", borderRadius: 0, color: "#92400E" }}>
                A platform fee was already confirmed for this deal. Exiting does not automatically refund it — email <strong>hello@hockystick.app</strong> and our team will resolve it manually.
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 border px-4 text-sm" style={{ borderColor: BORDER, color: INK2, height: 36, borderRadius: 2 }}>Stay in the deal</button>
              <button onClick={() => setOpen(false)} className="flex-1 px-4 text-sm font-medium text-white" style={{ background: "#DC2626", height: 36, borderRadius: 2 }}>Exit closing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
