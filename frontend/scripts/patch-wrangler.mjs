import { existsSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

// 1. Remove "assets" key from dist/client/wrangler.json
// Pages does not support the "assets" config key.
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
// Pages Advanced Mode: _worker.js handles SSR, Pages CDN serves static assets.
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

// 3. Prepend MessageChannel polyfill
// react-dom/server.browser uses MessageChannel which may not be available
// in all Cloudflare Pages environments. This polyfill is a no-op when the
// runtime already provides it.
const polyfill = `\
if(typeof MessageChannel==="undefined"){
  class _MC{constructor(){this.port1={onmessage:null,postMessage:(d)=>{this.port2.onmessage&&this.port2.onmessage({data:d})}};this.port2={onmessage:null,postMessage:(d)=>{this.port1.onmessage&&this.port1.onmessage({data:d})}}}}
  globalThis.MessageChannel=_MC;
}
`;
const workerCode = readFileSync("dist/client/_worker.js", "utf8");
writeFileSync("dist/client/_worker.js", polyfill + workerCode);
console.log("✓ dist/client/_worker.js ready (with MessageChannel polyfill)");
