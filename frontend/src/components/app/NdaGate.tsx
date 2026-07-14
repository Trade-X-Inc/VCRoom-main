import { useState } from "react";
import { Shield, Lock, CheckCircle2 } from "lucide-react";
import { ndaAcceptedStore, generatedNdaDocsStore, participantsStore, useParticipants } from "@/lib/store";

interface NdaGateProps {
  dealRoomId: string;
  dealRoomName: string;
  participantName: string;
  companyName: string;
  onAccepted: () => void;
}

export function NdaGate({ dealRoomId, dealRoomName, participantName, companyName, onAccepted }: NdaGateProps) {
  const [agreed, setAgreed] = useState(false);
  const [a, b] = [Math.floor(Math.random() * 8) + 2, Math.floor(Math.random() * 8) + 2];
  const [puzzleQ] = useState({ a, b });
  const [answer, setAnswer] = useState("");
  const participants = useParticipants();

  const puzzleOk = parseInt(answer, 10) === puzzleQ.a + puzzleQ.b;
  const canAccept = agreed && puzzleOk;

  const accept = () => {
    if (!canAccept) return;
    ndaAcceptedStore.set((s) => ({ ...s, [`${dealRoomId}:${participantName}`]: true }));
    participantsStore.set((xs) =>
      xs.map((p) => (p.dealRoomId === dealRoomId && p.name === participantName ? { ...p, status: "NDA Accepted", dateJoined: p.dateJoined ?? "just now" } : p))
    );
    const roomP = participants.filter((p) => p.dealRoomId === dealRoomId);
    const allAccepted = roomP.every((p) => p.name === participantName || p.status === "NDA Accepted" || p.status === "Active");
    if (allAccepted && roomP.length > 0) {
      generatedNdaDocsStore.set((xs) =>
        xs.find((d) => d.dealRoomId === dealRoomId) ? xs : [...xs, { dealRoomId, name: `NDA — ${dealRoomName}.pdf`, createdAt: new Date().toISOString() }]
      );
    }
    onAccepted();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center p-6 bg-background">
      <div className="w-full max-w-xl rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden">
        <div className="bg-gradient-mesh h-20 relative">
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-background border border-border/60 shadow-card">
              <Shield className="h-6 w-6 text-brand" />
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold text-center">System Generated NDA</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-center">Non-Disclosure Agreement</h1>
          <p className="text-center text-sm text-muted-foreground mt-1">Please review and accept to enter this deal room.</p>

          <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-border/60 p-3"><div className="text-muted-foreground">Deal room</div><div className="font-medium truncate">{dealRoomName}</div></div>
            <div className="rounded-lg border border-border/60 p-3"><div className="text-muted-foreground">Participant</div><div className="font-medium truncate">{participantName}</div></div>
            <div className="rounded-lg border border-border/60 p-3"><div className="text-muted-foreground">Company</div><div className="font-medium truncate">{companyName}</div></div>
          </div>

          <div className="mt-5 max-h-48 overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Mutual Non-Disclosure Agreement</p>
            <p>This Agreement is entered into between {companyName} and {participantName} (the "Parties") for the purpose of evaluating a potential business or investment relationship in connection with {dealRoomName}.</p>
            <p className="mt-2">Each Party agrees to hold in strict confidence all proprietary information, including but not limited to financial data, customer lists, technology, business plans, and any documents shared within this deal room. Confidential Information may not be disclosed to any third party without prior written consent.</p>
            <p className="mt-2">All materials accessed via this deal room are watermarked, logged, and monitored. Any breach of this agreement may result in legal action and immediate revocation of access.</p>
            <p className="mt-2">By accepting this NDA, you acknowledge that you have read, understood, and agree to these terms.</p>
          </div>

          <label className="mt-5 flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <span>I have read and agree to the terms of this Non-Disclosure Agreement.</span>
          </label>

          <div className="mt-4 rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="text-xs text-muted-foreground mb-2">Quick verification — solve to continue:</div>
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium">{puzzleQ.a} + {puzzleQ.b} =</div>
              <input value={answer} onChange={(e) => setAnswer(e.target.value)} className="w-24 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm" />
              {puzzleOk && <CheckCircle2 className="h-4 w-4 text-success" />}
            </div>
          </div>

          <button
            onClick={accept}
            disabled={!canAccept}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-brand text-brand-foreground py-2.5 text-sm font-medium shadow-glow disabled:opacity-50 disabled:shadow-none"
          >
            <Lock className="h-4 w-4" /> Accept NDA & enter deal room
          </button>
        </div>
      </div>
    </div>
  );
}
