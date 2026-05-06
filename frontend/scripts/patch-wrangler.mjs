import { existsSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

// 1. Remove "assets" key from dist/client/wrangler.json
// Pages does not support the "assets" config key — the adapter adds it but
// wrangler pages deploy rejects it.
const pagesWranglerPath = "dist/client/wrangler.json";
if (existsSync(pagesWranglerPath)) {
  const cfg = JSON.parse(readFileSync(pagesWranglerPath, "utf8"));
  if (cfg.assets !== undefined) {
    delete cfg.assets;
    writeFileSync(pagesWranglerPath, JSON.stringify(cfg));
    console.log("✓ Removed 'assets' key from dist/client/wrangler.json");
  }
}

// 2. Bundle dist/server/server.js → dist/client/_worker.js
// Cloudflare Pages Advanced Mode: _worker.js handles SSR for non-asset paths.
// Pages CDN serves everything in dist/client/ (CSS, JS, images) directly.
if (!existsSync("dist/server/server.js")) {
  console.error("✘ dist/server/server.js not found — did the build run?");
  process.exit(1);
}

console.log("Bundling server.js → _worker.js ...");
execSync(
  [
    "node_modules/.bin/esbuild",
    "dist/server/server.js",
    "--bundle",
    "--format=esm",
    "--platform=browser",
    "--external:node:*",
    "--conditions=worker,browser",
    "--outfile=dist/client/_worker.js",
    "--log-level=warning",
  ].join(" "),
  { stdio: "inherit" }
);
console.log("✓ dist/client/_worker.js ready");
