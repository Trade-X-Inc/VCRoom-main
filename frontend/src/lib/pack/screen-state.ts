// Pure render-state choice for the three /pack screens (index, detail, missing). No React, router or server
// imports, so it can be unit-tested in plain Node (tests/pack-screen-state.spec.ts).
//
// Rules this encodes:
//   * "error" is chosen ONLY when a query has actually FAILED (react-query status "error"). A query that has
//     not started, is disabled, or is waiting for the signed-in user to be built has status "pending" and is
//     LOADING. "No data yet" is never evidence of failure.
//   * While the auth session is still starting, show a loading state, never an empty or error state.
//   * A logged-out visitor is redirected to sign-in (the screens run that redirect themselves; see
//     usePackAuthGate), so no data state is ever shown to them.
//   * "Empty" (no fields / nothing missing / no schedule) is only ever chosen when the data query SUCCEEDED
//     and came back empty.
export type PackScreenState =
  | "loading" // auth starting, startup lookup not settled, or the data query not settled
  | "redirect" // logged out: go to /sign-in
  | "invalid" // the pack id in the URL is not a uuid
  | "startup" // zero or several companies: show the startup lookup message
  | "error" // generic load error (a query really failed)
  | "empty" // data loaded and there is nothing to show
  | "ready"; // data loaded with content

// react-query's `status`: "pending" covers not started, disabled and in flight (including retries).
export type QueryStatus = "pending" | "error" | "success";

export type PackScreenInput = {
  authInitialized: boolean; // the auth store has resolved the session (user or null)
  hasUser: boolean; // the auth store holds a user
  idValid: boolean; // true on the index screen, which has no id
  startupStatus: QueryStatus; // the founder-startup lookup query
  startupMessage: string | null; // none/multiple-company message, set when that lookup settled with its known error
  dataStatus: QueryStatus; // the screen's data (already combined across its queries)
  isEmpty: boolean; // meaningful only when dataStatus is "success"
};

// One status for several queries: any failure is a failure; otherwise any unsettled query keeps it loading.
export function combineQueryStatus(
  statuses: readonly QueryStatus[],
): QueryStatus {
  if (statuses.includes("error")) return "error";
  if (statuses.includes("pending")) return "pending";
  return "success";
}

export function choosePackScreenState(i: PackScreenInput): PackScreenState {
  if (!i.authInitialized) return "loading";
  if (!i.hasUser) return "redirect";
  if (!i.idValid) return "invalid";
  if (i.startupStatus === "pending") return "loading";
  if (i.startupMessage) return "startup";
  if (i.startupStatus === "error") return "error";
  if (i.dataStatus === "pending") return "loading";
  if (i.dataStatus === "error") return "error";
  return i.isEmpty ? "empty" : "ready";
}
