import { createContext, useContext } from "react";
import type { DealRoomContext } from "@/hooks/useDealRoomContext";

// Lives outside src/routes so TanStack Router's automatic per-route code
// splitting never gives the layout and its child tabs two separate
// evaluations of this module (which would make the Context identity differ
// and useContext() return null in every child).
export const DealRoomCtx = createContext<DealRoomContext | null>(null);

export function useDealRoom(): DealRoomContext {
  const ctx = useContext(DealRoomCtx);
  if (!ctx) throw new Error("useDealRoom() must be used inside /deal-rooms/:id/*");
  return ctx;
}
