import { existsSync } from "fs";
import { execSync } from "child_process";

// Bundle dist/server/server.js into dist/client/_worker.js
// Cloudflare Pages Advanced Mode: _worker.js is the SSR handler for non-asset paths.
// esbuild bundles everything except node: built-ins (handled by nodejs_compat flag).
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
