import { createFileRoute } from "@tanstack/react-router";
import { SolutionPage } from "@/components/site/SolutionPage";
import { Users } from "lucide-react";

export const Route = createFileRoute("/founders")({
  head: () => ({
    meta: [
      { title: "For Founders — Hockeystick" },
      { name: "description", content: "Run your fundraise like a pro. CRM, AI email, deal rooms — built for founders." },
    ],
  }),
  component: () => (
    <SolutionPage
      eyebrow="For Founders"
      title="Your fundraise. In one room."
      sub="Stop juggling spreadsheets, inboxes, and Drive folders. Hockeystick gives you a single workspace to run the entire raise."
      Icon={Users}
      features={[
        ["Pipeline that thinks", "Drag-drop kanban with stage analytics, AI follow-ups, and intro suggestions."],
        ["AI email that sounds like you", "Cold outreach, replies, and weekly updates drafted in your voice."],
        ["Deal rooms that close", "NDA, documents, Q&A, checklist, and decision board — in one structured flow."],
      ]}
    />
  ),
});
