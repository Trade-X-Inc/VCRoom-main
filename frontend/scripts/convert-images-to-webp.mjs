// SEO-003 — one-off conversion of the 11 flagged public-site content
// images to WebP, run manually (not wired into the build). Originals are
// kept untouched alongside the new .webp files per the phase's own
// instruction (Cloudflare Pages may reference the original path via
// Workers or cache). Excludes: hero-image.jpg / hero-device.jpg (orphaned,
// zero references anywhere), og-image.png / favicon-512x512.png (format-
// risk: OG/social-crawler and favicon consumers have inconsistent WebP
// support — excluded on explicit instruction), and everything already
// under the 80KB threshold.
import sharp from "sharp";
import { statSync } from "node:fs";

const PHOTOS_QUALITY = 82;
const GRAPHICS_QUALITY = 90;

const targets = [
  { path: "public/lengdon-logo-icon.png", quality: GRAPHICS_QUALITY, kind: "logo" },
  { path: "public/lengdon-logo-full.png", quality: GRAPHICS_QUALITY, kind: "logo" },
  { path: "public/images/homepage/process-counsel.jpg", quality: PHOTOS_QUALITY, kind: "photo" },
  { path: "public/images/homepage/security-infrastructure.jpg", quality: PHOTOS_QUALITY, kind: "photo" },
  { path: "public/images/homepage/process-conditions.jpg", quality: PHOTOS_QUALITY, kind: "photo" },
  { path: "public/images/homepage/process-close.jpg", quality: PHOTOS_QUALITY, kind: "photo" },
  { path: "public/images/homepage/process-agreement.jpg", quality: PHOTOS_QUALITY, kind: "photo" },
  { path: "public/images/homepage/process-signing.jpg", quality: PHOTOS_QUALITY, kind: "photo" },
  { path: "public/images/homepage/process-payment.jpg", quality: PHOTOS_QUALITY, kind: "photo" },
  { path: "public/images/homepage/demo-video-poster.jpg", quality: PHOTOS_QUALITY, kind: "photo" },
  { path: "public/images/homepage/cta-transaction.jpg", quality: PHOTOS_QUALITY, kind: "photo" },
];

let totalBefore = 0;
let totalAfter = 0;

for (const t of targets) {
  const outPath = t.path.replace(/\.(jpe?g|png)$/i, ".webp");
  const beforeSize = statSync(t.path).size;
  await sharp(t.path).webp({ quality: t.quality }).toFile(outPath);
  const afterSize = statSync(outPath).size;
  totalBefore += beforeSize;
  totalAfter += afterSize;
  console.log(
    `${t.path} (${t.kind}, q${t.quality}): ${(beforeSize / 1024).toFixed(1)}KB -> ${outPath}: ${(afterSize / 1024).toFixed(1)}KB` +
    ` (${(100 - (afterSize / beforeSize) * 100).toFixed(0)}% smaller)`
  );
}

console.log(`\nTotal: ${(totalBefore / 1024).toFixed(1)}KB -> ${(totalAfter / 1024).toFixed(1)}KB (${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}% smaller)`);
