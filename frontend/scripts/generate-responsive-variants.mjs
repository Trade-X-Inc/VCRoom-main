// SEO-017 Phase 2c — responsive srcset variants for the homepage's below-
// the-fold images, generated from the same already-lazy-loaded sources
// (Phase 2b). sharp is already a project dependency (see
// convert-images-to-webp.mjs, same pattern) — run manually, not part of
// the build pipeline, one-off like that script.
//
// Widths chosen from real rendered layout, not guessed — traced each
// image's actual CSS container at 375/768/1440 before picking sizes:
//   - demo-video-poster: flex-1 in a flex-col<lg>/flex-row>=lg split,
//     paired with a max-w-[480px] form panel. Renders ~279px (375, px-12
//     padding), ~672px (768, still stacked below lg), ~800px (1440, side
//     by side at lg). 640w covers 375/768; 960w covers 1440 with retina
//     headroom.
//   - process-*.webp (6 files, one shared <img>): w-[55%] lg:w-[58%] of
//     a flex-1 column beside a hidden-below-lg 480/540px sidebar. Renders
//     ~206px (375), ~422px (768), ~522px (1440, matches the existing
//     intrinsic width={522} attr exactly). 640w/960w/1400w per the task's
//     explicit instruction to keep a 1400w tier for these specifically.
//   - security-infrastructure.webp: flex-col<lg>/flex-row>=lg, two equal
//     flex-1 columns at lg+. Renders ~375px (375, stacked), ~768px (768,
//     still stacked below lg=1024), ~720px (1440, half of container).
//     640w/960w covers this range without needing 1400w.
//   - cta-transaction.webp: stacked full-width below lg, fixed
//     lg:w-[420px] xl:w-[480px] at lg+. Renders ~375px, ~768px, 480px
//     (1440, at xl). 640w/960w covers it.
//
// Originals are kept untouched alongside the new files, same convention
// as convert-images-to-webp.mjs — nothing deletes or overwrites a source.

import sharp from "sharp";
import { statSync } from "node:fs";

const targets = [
  { path: "public/images/homepage/demo-video-poster.webp", widths: [640, 960], quality: 82 },
  { path: "public/images/homepage/process-counsel.webp", widths: [640, 960, 1400], quality: 82 },
  { path: "public/images/homepage/process-agreement.webp", widths: [640, 960, 1400], quality: 82 },
  { path: "public/images/homepage/process-conditions.webp", widths: [640, 960, 1400], quality: 82 },
  { path: "public/images/homepage/process-signing.webp", widths: [640, 960, 1400], quality: 82 },
  { path: "public/images/homepage/process-payment.webp", widths: [640, 960, 1400], quality: 82 },
  { path: "public/images/homepage/process-close.webp", widths: [640, 960, 1400], quality: 82 },
  { path: "public/images/homepage/security-infrastructure.webp", widths: [640, 960], quality: 82 },
  { path: "public/images/homepage/cta-transaction.webp", widths: [640, 960], quality: 82 },
];

let totalBefore = 0;
let totalAfter = 0;

for (const t of targets) {
  const beforeSize = statSync(t.path).size;
  totalBefore += beforeSize;
  const base = t.path.replace(/\.webp$/i, "");
  for (const w of t.widths) {
    const outPath = `${base}-${w}w.webp`;
    await sharp(t.path).resize({ width: w, withoutEnlargement: true }).webp({ quality: t.quality }).toFile(outPath);
    const afterSize = statSync(outPath).size;
    totalAfter += afterSize;
    console.log(
      `${t.path} -> ${outPath}: ${(afterSize / 1024).toFixed(1)}KB (source ${(beforeSize / 1024).toFixed(1)}KB)`
    );
  }
}

console.log(`\nOriginals total: ${(totalBefore / 1024).toFixed(1)}KB (unchanged, kept alongside variants)`);
console.log(`New variants total: ${(totalAfter / 1024).toFixed(1)}KB across ${targets.reduce((n, t) => n + t.widths.length, 0)} files`);
