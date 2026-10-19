// Side-effect module, imported FIRST by the root route. Runs once in the browser
// at start-up, before auth-js has processed (and cleared) the address, and
// before any page renders. See lib/recovery.ts for why this exists.
import {
  isRecoverySession,
  markRecoverySession,
  pathAllowedDuringRecovery,
  urlIsRecovery,
} from "./recovery";

if (typeof window !== "undefined") {
  try {
    const href = window.location.href;
    const landingIsRecovery = urlIsRecovery(href);
    if (landingIsRecovery) markRecoverySession();
    // A later visit with the mark already set and no recovery tokens in the address (so nothing to lose by
    // navigating): send straight to the new-password screen before anything else loads.
    if (
      !landingIsRecovery &&
      isRecoverySession() &&
      !pathAllowedDuringRecovery(window.location.pathname)
    ) {
      window.location.replace("/reset-password");
    }
  } catch {
    /* never block start-up */
  }
}
