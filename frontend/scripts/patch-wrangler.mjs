import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

// Fix asset directory path in the auto-generated dist/server/wrangler.json.
// The adapter writes "../client" (relative to dist/server/) but wrangler
// resolves it from CWD when run from frontend/, causing assets to be missed.
// Using an absolute path removes the ambiguity.
const wranglerPath = "dist/server/wrangler.json";

if (!existsSync(wranglerPath)) {
  console.error("✘ dist/server/wrangler.json not found — did the build run?");
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(wranglerPath, "utf8"));

if (cfg.assets) {
  cfg.assets.directory = resolve("dist/client");
  // Remove binding — Cloudflare routes matching assets directly before
  // invoking the Worker. Binding is only needed for programmatic access
  // inside the Worker, which this app doesn't use.
  delete cfg.assets.binding;
  writeFileSync(wranglerPath, JSON.stringify(cfg));
  console.log("✓ Patched dist/server/wrangler.json: absolute assets path, binding removed");
}
