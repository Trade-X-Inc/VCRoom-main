import { useCallback, useRef, useState } from "react";
import { withTimeout, AITimeoutError } from "@/lib/with-timeout";

const STILL_WORKING_AFTER_MS = 9000;
const HARD_TIMEOUT_MS = 25000;

/**
 * Standardizes the loading lifecycle for AI/edge-function calls:
 *  - isWorking: true for the whole request
 *  - stillWorking: true after STILL_WORKING_AFTER_MS, for a secondary
 *    "this may take a moment" message
 *  - run() races the call against HARD_TIMEOUT_MS and throws AITimeoutError
 *    on timeout, so callers can branch on err instanceof AITimeoutError
 */
export function useTimedAI() {
  const [isWorking, setIsWorking] = useState(false);
  const [stillWorking, setStillWorking] = useState(false);
  const stillWorkingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const run = useCallback(async <T,>(fn: () => Promise<T>, timeoutMs = HARD_TIMEOUT_MS): Promise<T> => {
    setIsWorking(true);
    setStillWorking(false);
    stillWorkingTimer.current = setTimeout(() => setStillWorking(true), STILL_WORKING_AFTER_MS);
    try {
      return await withTimeout(fn(), timeoutMs);
    } finally {
      clearTimeout(stillWorkingTimer.current);
      setIsWorking(false);
      setStillWorking(false);
    }
  }, []);

  return { isWorking, stillWorking, run };
}

export { AITimeoutError };

export const AI_TIMEOUT_MESSAGE = "This is taking longer than expected — try again.";
export const AI_STILL_WORKING_MESSAGE = "Still working — this may take a moment.";
