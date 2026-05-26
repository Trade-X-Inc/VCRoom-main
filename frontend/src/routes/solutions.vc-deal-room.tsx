import { createFileRoute } from "@tanstack/react-router";
import { SolutionPage } from "@/components/site/SolutionPage";
import { Briefcase } from "lucide-react";

export const Route = createFileRoute("/solutions/vc-deal-room")({
  head: () => ({
    meta: [
      { title: "VC Deal Room Software — Hockystick" },
      { name: "description", content: "Structured deal rooms with NDA, document vault, Q&A, and decision board." },
    ],
  }),
  component: () => (
    <SolutionPage
      eyebrow="VC Deal Room"
      title="Where diligence becomes decision."
      sub="Stop sharing Drive folders. Open a structured deal room with NDA, documents, Q&A, and decision board in one click."
      Icon={Briefcase}
      features={[
        ["Watermarked vault", "Track every view, download, and access. Revoke instantly."],
        ["Async Q&A", "Threaded questions per document. Investors stop emailing 'one more thing'."],
        ["Decision board", "Status, risk, notes — visible to your whole partnership."],
      ]}
    />
  ),
});
