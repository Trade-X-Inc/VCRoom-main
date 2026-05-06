import { readFileSync, writeFileSync } from "fs";

const path = "dist/server/wrangler.json";
const config = JSON.parse(readFileSync(path, "utf8"));

// Remove ASSETS binding so Cloudflare serves static files directly
// before requests reach the Worker. With binding, all requests go
// through the Worker which doesn't call env.ASSETS.fetch(), breaking CSS.
if (config.assets?.binding) {
  delete config.assets.binding;
  writeFileSync(path, JSON.stringify(config));
  console.log("✓ Removed ASSETS binding from dist/server/wrangler.json");
}
