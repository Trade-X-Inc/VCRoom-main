import { DealFlowHome } from "@/components/app/DealFlowHome";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/investor/")({
  component: DealFlowHome,
});
