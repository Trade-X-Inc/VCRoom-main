// Pure-logic tests (no browser, no network) for the pack screens' pinned-schedule handling.
import { test, expect } from "@playwright/test";
import {
  pinnedScheduleQueryKey,
  sortScheduleFields,
  scheduleMatchesPack,
  friendlyError,
  ERROR_MESSAGES,
  GENERIC_ERROR_MESSAGE,
} from "../src/lib/pack/pinned-schedule";

const PACK_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PACK_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SCHEDULE_V1 = "11111111-1111-1111-1111-111111111111"; // technology/seed v1
const SCHEDULE_V2 = "22222222-2222-2222-2222-222222222222"; // a newer technology/seed version

test("the schedule query key includes the pack id, so packs never share a cached schedule", () => {
  expect(pinnedScheduleQueryKey(PACK_A)).toContain(PACK_A);
  expect(pinnedScheduleQueryKey(PACK_A)).not.toEqual(
    pinnedScheduleQueryKey(PACK_B),
  );
  expect(pinnedScheduleQueryKey(PACK_A)).not.toContain("technology");
});

test("fields are ordered by sort_order and the input is not mutated", () => {
  const input = [
    { id: "c", sort_order: 3 },
    { id: "a", sort_order: 1 },
    { id: "b", sort_order: 2 },
  ];
  expect(sortScheduleFields(input).map((f) => f.id)).toEqual(["a", "b", "c"]);
  expect(input.map((f) => f.id)).toEqual(["c", "a", "b"]);
  expect(sortScheduleFields(undefined)).toEqual([]);
});

test("a pack pinned to an older version accepts its own schedule and rejects the latest one", () => {
  // Mock: the pack is pinned to v1 while v2 (the latest published) exists.
  const pack = { schedule_id: SCHEDULE_V1 };
  expect(scheduleMatchesPack(pack, { id: SCHEDULE_V1 })).toBe(true);
  expect(scheduleMatchesPack(pack, { id: SCHEDULE_V2 })).toBe(false);
});

test("a pack pinned to a schedule that is not technology/seed's latest is accepted when the response is its own", () => {
  const pack = { schedule_id: SCHEDULE_V2 };
  expect(scheduleMatchesPack(pack, { id: SCHEDULE_V2 })).toBe(true);
  expect(scheduleMatchesPack(pack, { id: SCHEDULE_V1 })).toBe(false);
});

test("nothing to compare yet is not a mismatch", () => {
  expect(scheduleMatchesPack(undefined, { id: SCHEDULE_V1 })).toBe(true);
  expect(scheduleMatchesPack({ schedule_id: SCHEDULE_V1 }, undefined)).toBe(
    true,
  );
});

test("pack_schedule_get errors map to the screens' friendly messages", () => {
  expect(friendlyError(new Error("not_authenticated"))).toBe(
    ERROR_MESSAGES.not_authenticated,
  );
  expect(friendlyError(new Error("forbidden"))).toBe(ERROR_MESSAGES.forbidden);
  expect(friendlyError(new Error("not_found"))).toBe(ERROR_MESSAGES.not_found);
  expect(ERROR_MESSAGES.forbidden).toBe("You don't have access to this pack.");
  expect(ERROR_MESSAGES.not_found).toBe(
    "That field or pack could not be found.",
  );
});

test("unknown, raw or non-Error failures never show raw text", () => {
  for (const e of [
    new Error("pack_schedule_get_failed"),
    new Error("pack_schedule_get_rpc_failed"),
    new Error("schedule_mismatch"),
    new Error('duplicate key value violates unique constraint "x"'),
    new Error("toString"),
    new Error("__proto__"),
    "forbidden",
    null,
    undefined,
    42,
  ]) {
    expect(friendlyError(e)).toBe(GENERIC_ERROR_MESSAGE);
  }
});
