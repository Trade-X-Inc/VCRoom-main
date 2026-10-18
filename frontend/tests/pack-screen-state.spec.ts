// Pure-logic tests (no browser, no network) for the render-state choice on the /pack screens.
import { test, expect } from "@playwright/test";
import {
  choosePackScreenState,
  type PackScreenInput,
} from "../src/lib/pack/screen-state";

// A fully loaded, logged-in baseline; each test overrides what it is about.
const base: PackScreenInput = {
  authInitialized: true,
  hasUser: true,
  idValid: true,
  startupLoading: false,
  startupMessage: null,
  dataPending: false,
  hasError: false,
  dataLoaded: true,
  isEmpty: false,
};
const state = (o: Partial<PackScreenInput>) =>
  choosePackScreenState({ ...base, ...o });

test("auth initialising shows loading, never empty or error", () => {
  // Even with data flags that would otherwise mean empty or error.
  expect(
    state({
      authInitialized: false,
      hasUser: false,
      dataLoaded: false,
      isEmpty: true,
      hasError: true,
    }),
  ).toBe("loading");
});

test("no user once auth has resolved redirects, and never shows a data state", () => {
  expect(state({ hasUser: false })).toBe("redirect");
  expect(
    state({ hasUser: false, dataLoaded: false, isEmpty: true, idValid: false }),
  ).toBe("redirect");
});

test("schedule undefined (query never produced data) is the generic error, not empty", () => {
  expect(state({ dataLoaded: false, isEmpty: true })).toBe("error");
  expect(state({ dataLoaded: false })).toBe("error");
});

test("a failed query is the generic error even if it left no data", () => {
  expect(state({ hasError: true, dataLoaded: false, isEmpty: true })).toBe(
    "error",
  );
});

test("empty is chosen only for a loaded schedule with zero fields", () => {
  expect(state({ dataLoaded: true, isEmpty: true })).toBe("empty");
  expect(state({ dataLoaded: true, isEmpty: false })).toBe("ready");
});

test("loading precedes error and empty while a query is still running", () => {
  expect(state({ dataPending: true, dataLoaded: false, isEmpty: true })).toBe(
    "loading",
  );
  expect(state({ startupLoading: true })).toBe("loading");
});

test("invalid id and startup-lookup messages keep their own states for a logged-in user", () => {
  expect(state({ idValid: false })).toBe("invalid");
  expect(
    state({
      startupMessage: "No company profile found for your account.",
      dataLoaded: false,
    }),
  ).toBe("startup");
});

test("a schedule with fields is ready", () => {
  expect(state({})).toBe("ready");
});
