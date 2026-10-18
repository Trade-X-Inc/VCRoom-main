// Pure render-state choice for the three /pack screens (index, detail, missing). No React, router or server
// imports, so it can be unit-tested in plain Node (tests/pack-screen-state.spec.ts).
//
// Rules this encodes:
//   * While the auth session is still starting, show a loading state, never an empty or error state.
//   * A logged-out visitor is redirected to sign-in (the screens run that redirect themselves; see
//     usePackAuthGate), so no data state is ever shown to them.
//   * "Empty" (no fields / nothing missing / no schedule) is only ever chosen when the data query SUCCEEDED
//     and came back empty. If the data is missing for any other reason, the screen shows its generic load
//     error, never a claim that something is empty.
export type PackScreenState =
  | "loading" // auth starting, startup lookup running, or the data query is running
  | "redirect" // logged out: go to /sign-in
  | "invalid" // the pack id in the URL is not a uuid
  | "startup" // zero or several companies: show the startup lookup message
  | "error" // generic load error
  | "empty" // data loaded and there is nothing to show
  | "ready"; // data loaded with content

export type PackScreenInput = {
  authInitialized: boolean; // the auth store has resolved the session (user or null)
  hasUser: boolean;
  idValid: boolean; // true on the index screen, which has no id
  startupLoading: boolean;
  startupMessage: string | null;
  dataPending: boolean; // an ENABLED data query has not settled yet
  hasError: boolean; // any query settled with an error
  dataLoaded: boolean; // the main data query succeeded and returned its payload
  isEmpty: boolean; // meaningful only when dataLoaded
};

export function choosePackScreenState(i: PackScreenInput): PackScreenState {
  if (!i.authInitialized) return "loading";
  if (!i.hasUser) return "redirect";
  if (!i.idValid) return "invalid";
  if (i.startupLoading) return "loading";
  if (i.startupMessage) return "startup";
  if (i.dataPending) return "loading";
  if (i.hasError) return "error";
  if (!i.dataLoaded) return "error";
  return i.isEmpty ? "empty" : "ready";
}
