/**
 * Axe (wcag2a, wcag2aa, wcag21aa, wcag22aa) on every rendered email, at 600 px (the email's own width) and 375 px.
 * The HTML is rendered in memory and loaded with setContent: no server, no network, nothing is sent.
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  SUPABASE_TEMPLATES,
  renderSupabaseTemplate,
} from "../src/lib/email/supabase-templates";
import { APP_SAMPLES } from "../src/lib/email/email-samples";
import { fillSample } from "../src/lib/email/email-samples";

const emails = [
  ...APP_SAMPLES.map((s) => ({ id: "app " + s.id, html: s.mail.html })),
  ...SUPABASE_TEMPLATES.map((t) => ({
    id: "supabase " + t.id,
    html: fillSample(renderSupabaseTemplate(t)),
  })),
];

for (const width of [600, 375]) {
  test.describe(`emails at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const e of emails) {
      test(`axe: ${e.id}`, async ({ page }) => {
        await page.setContent(e.html, { waitUntil: "load" });
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(
          results.violations.map(
            (v) =>
              `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
          ),
        ).toEqual([]);
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow, "horizontal scroll").toBe(0);
      });
    }
  });
}
