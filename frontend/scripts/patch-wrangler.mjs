import { existsSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

// 1. Replace dist/client/wrangler.json with a clean minimal file.
// The @cloudflare/vite-plugin generates this with absolute local Mac paths
// (configPath, userConfigPath, pages_build_output_dir) which break CF runtime.
// We overwrite it with only the fields CF Pages actually needs.
const pagesWranglerPath = "dist/client/wrangler.json";
const cleanWrangler = {
  name: "vcroom-main",
  compatibility_date: "2026-01-01",
  compatibility_flags: ["nodejs_compat"],
};
writeFileSync(pagesWranglerPath, JSON.stringify(cleanWrangler, null, 2));
console.log("✓ dist/client/wrangler.json rewritten (clean, no local paths)");

// 2. Bundle dist/server/server.js → dist/client/_worker.js
// Pages Advanced Mode: _worker.js handles SSR, Pages CDN serves static assets.
if (!existsSync("dist/server/server.js")) {
  console.error("✘ dist/server/server.js not found — did the build run?");
  process.exit(1);
}

console.log("Bundling server.js → _worker.js ...");
// External libraries that are client-side only and must not be bundled into the
// CF Worker. They are only called from browser event handlers (file upload/parse)
// and are loaded via dynamic import on the client. Including them in the server
// bundle pushes the compressed worker past CF's 1MB script limit.
// Step 1: bundle unminified (so the regex patch below can find the export marker)
execSync(
  [
    "node_modules/.bin/esbuild",
    "dist/server/server.js",
    "--bundle",
    "--format=esm",
    "--platform=browser",
    "--external:node:*",
    "--external:ws",
    "--external:pdfjs-dist",
    "--external:xlsx",
    "--external:papaparse",
    "--external:jszip",
    "--define:process.env.NODE_ENV='\"production\"'",
    "--define:global.process.env.NODE_ENV='\"production\"'",
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

// 4. Patch _worker.js to expose Cloudflare Pages secrets via process.env
// CF Pages passes secrets as the `env` parameter of fetch(request, env, ctx).
// TanStack Start's createServerEntry swallows this — it only uses `request`.
// We wrap the default export so secrets are injected before any handler runs.
const cfEnvPatch = `\
(function patchCFEnv() {
  const __orig = self.__cfWorkerExports || {};
  const __origFetch = typeof __orig.fetch === 'function' ? __orig.fetch.bind(__orig) : null;
  if (!__origFetch) return;
  __orig.fetch = async function(request, env, ctx) {
    if (env && typeof env === 'object') {
      try {
        globalThis.__cf_env = env;
        for (const [k, v] of Object.entries(env)) {
          if (typeof v === 'string' && typeof process !== 'undefined' && process.env && !process.env[k]) {
            process.env[k] = v;
          }
        }
      } catch(e) {}
    }
    return __origFetch(request, env, ctx);
  };
})();
`;

let workerCode = readFileSync("dist/client/_worker.js", "utf8");

// Wrap default export to inject CF env on every request.
// The init_serverN() call number changes each build, so we use a regex.
const initCallMatch = workerCode.match(/init_server\d*\(\);\nexport \{/);
if (initCallMatch) {
  const initCall = initCallMatch[0].replace('\nexport {', '');   // e.g. "init_server4();"
  const injection = `\
${initCall}
// Inject CF env into globalThis.__cf_env and process.env before any handler runs
const __origServer = server;
const __patchedServer = {
  async fetch(request, env, ctx) {
    if (env && typeof env === 'object') {
      try {
        globalThis.__cf_env = { ...env };
        for (const [k, v] of Object.entries(env)) {
          if (typeof v === 'string' && typeof process !== 'undefined' && process.env && !process.env[k]) {
            process.env[k] = v;
          }
        }
        const safeKeys = Object.keys(env).filter(k => !k.includes('KEY') && !k.includes('SECRET') && !k.includes('TOKEN'));
        const secretKeys = Object.keys(env).filter(k => k.includes('KEY') || k.includes('SECRET') || k.includes('TOKEN'));
        console.log('[Worker] CF env keys available:', safeKeys);
        console.log('[Worker] Secret keys present:', secretKeys.map(k => k + '=' + (env[k] ? '\\u2713' : '\\u2717')));
      } catch(e) { console.error('[Worker] env injection error:', e); }
    }
    return __origServer.fetch(request, env, ctx);
  }
};
// IMPORTANT: Only export default — CF Workers runtime rejects named exports that
// are not ExportedHandler functions (e.g. TSS_SERVER_FUNCTION is a string/object,
// not a function, which causes "Incorrect type for map entry" startup crash).
export default __patchedServer;
// REMOVE_NAMED_EXPORTS_MARKER`;
  // Replace the entire export { ... } block with just the default export above.
  // The block ends at the first }; after "export {" — use a targeted replacement.
  workerCode = workerCode.replace(initCallMatch[0], injection);
  // Remove the old named export block that esbuild generated (everything from
  // "// REMOVE_NAMED_EXPORTS_MARKER" up to and including the closing "};" of export{}).
  // The named exports block looks like: \n  TSS_SERVER_FUNCTION as T,\n  ...\n  __patchedServer as default,\n  ...\n};
  workerCode = workerCode.replace(
    /\/\/ REMOVE_NAMED_EXPORTS_MARKER\n[\s\S]*?^};/m,
    '// named exports removed — CF Workers only needs default'
  );
  console.log("✓ dist/client/_worker.js patched (CF env injection)");
} else {
  console.warn("⚠ Could not find export marker in _worker.js — CF env patch skipped");
}

writeFileSync("dist/client/_worker.js", polyfill + workerCode);
console.log("✓ dist/client/_worker.js ready (with MessageChannel polyfill)");

// Step 2: minify the patched worker in-place to get under CF Pages' 1MB gzip limit
console.log("Minifying _worker.js ...");
execSync(
  [
    "node_modules/.bin/esbuild",
    "dist/client/_worker.js",
    "--minify",
    "--format=esm",
    "--platform=browser",
    "--outfile=dist/client/_worker.js",
    "--allow-overwrite",
    "--log-level=warning",
  ].join(" "),
  { stdio: "inherit" }
);
const minifiedSize = (readFileSync("dist/client/_worker.js").length / 1024 / 1024).toFixed(2);
console.log(`✓ _worker.js minified (${minifiedSize} MB uncompressed)`);

// Report gzip size
try {
  const gzSize = execSync("gzip -c dist/client/_worker.js | wc -c").toString().trim();
  const gzMB = (parseInt(gzSize) / 1024 / 1024).toFixed(2);
  console.log(`✓ _worker.js gzip size: ${gzMB} MB (CF Pages limit: 1 MB)`);
  if (parseFloat(gzMB) > 1.0) {
    console.error(`✘ WARNING: worker is ${gzMB} MB gzipped — exceeds CF Pages 1 MB limit`);
  }
} catch (_) {}
