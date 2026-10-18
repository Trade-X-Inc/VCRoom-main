// Pure-logic tests (no browser, no network) for the render-state choice on the /pack screens.
import { test, expect } from "@playwright/test";
import {
  choosePackScreenState,
  combineQueryStatus,
  type PackScreenInput,
} from "../src/lib/pack/screen-state";

// A fully loaded, signed-in baseline; each test overrides what it is about.
const base: PackScreenInput = {
  authInitialized: true,
  hasUser: true,
  idValid: true,
  startupStatus: "success",
  startupMessage: null,
  dataStatus: "success",
  isEmpty: false,
};
const state = (o: Partial<PackScreenInput>) =>
  choosePackScreenState({ ...base, ...o });

test("auth initialising shows loading, never empty or error", () => {
  expect(
    state({
      authInitialized: false,
      hasUser: false,
      startupStatus: "error",
      dataStatus: "error",
      isEmpty: true,
    }),
  ).toBe("loading");
});

test("no user once auth has resolved redirects, and never shows a data state", () => {
  expect(state({ hasUser: false })).toBe("redirect");
  expect(
    state({
      hasUser: false,
      startupStatus: "pending",
      dataStatus: "error",
      isEmpty: true,
      idValid: false,
    }),
  ).toBe("redirect");
});

test("REGRESSION: the auth store has a user but the startup lookup has not run yet is loading, never error", () => {
  // The exact gap from the live L9 finding: the store says "signed in", the page's own user (and so the
  // startup query) is not built yet, so the query is disabled with status "pending" and there is no data.
  expect(
    state({
      authInitialized: true,
      hasUser: true,
      startupStatus: "pending",
      dataStatus: "pending",
      isEmpty: true,
    }),
  ).toBe("loading");
  // Same with the data query reporting "no data": still loading, not error.
  expect(state({ startupStatus: "pending", dataStatus: "success" })).toBe(
    "loading",
  );
});

test("startup lookup: idle or pending is loading; failed is the generic error; none/multiple keeps its message", () => {
  expect(state({ startupStatus: "pending" })).toBe("loading");
  expect(state({ startupStatus: "error" })).toBe("error");
  expect(
    state({
      startupStatus: "error",
      startupMessage: "No company profile found for your account.",
    }),
  ).toBe("startup");
});

test("startup settled, schedule query pending is loading", () => {
  expect(state({ dataStatus: "pending", isEmpty: true })).toBe("loading");
});

test("schedule query failed is the generic error, even with nothing to show", () => {
  expect(state({ dataStatus: "error", isEmpty: true })).toBe("error");
  expect(state({ dataStatus: "error" })).toBe("error");
});

test("empty is chosen only for a successful query with nothing to show", () => {
  expect(state({ dataStatus: "success", isEmpty: true })).toBe("empty");
  expect(state({ dataStatus: "success", isEmpty: false })).toBe("ready");
});

test("invalid id keeps its own state for a signed-in user", () => {
  expect(state({ idValid: false })).toBe("invalid");
});

test("a schedule with fields is ready", () => {
  expect(state({})).toBe("ready");
});

test("combining queries: any failure fails, otherwise any pending is pending", () => {
  expect(combineQueryStatus(["success", "success"])).toBe("success");
  expect(combineQueryStatus(["pending", "success"])).toBe("pending");
  expect(combineQueryStatus(["pending", "error"])).toBe("error");
  expect(combineQueryStatus(["success", "error"])).toBe("error");
  expect(combineQueryStatus([])).toBe("success");
});
