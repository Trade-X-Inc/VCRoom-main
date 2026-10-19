// The shared page shell must not put aria-label on an element with no role (axe: aria-prohibited-attr). Source-level
// check in plain Node; the rendered check is the axe run recorded in CLAUDE.md.
import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";

const SRC = readFileSync(
  new URL("../src/components/lcs/PageShell.tsx", import.meta.url),
  "utf8",
);

test("every non-interactive element with aria-label in PageShell has a role", () => {
  // Opening tags that carry aria-label but are plain spans or divs.
  const tags = SRC.match(/<(span|div)\b[^>]*?aria-label=[^>]*>/gs) ?? [];
  expect(tags.length).toBeGreaterThan(0);
  for (const t of tags) expect(t).toMatch(/\brole=/);
});

test("the notifications placeholder is an image role with its label", () => {
  expect(SRC).toMatch(/role="img"\s+aria-label="Notifications"/);
});
