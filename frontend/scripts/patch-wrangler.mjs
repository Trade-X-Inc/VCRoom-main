import { existsSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

// 1. Clean dist/client/wrangler.json for Cloudflare Pages compatibility.
// The @cloudflare/vite-plugin generates fields that are only valid for
// Workers, not Pages. Remove them all before deployment.
const pagesWranglerPath = "dist/client/wrangler.json";
if (existsSync(pagesWranglerPath)) {
  const cfg = JSON.parse(readFileSync(pagesWranglerPath, "utf8"));

  const invalidTopLevel = [
    "assets",
    "triggers",
    "definedEnvironments",
    "ai_search_namespaces",
    "ai_search",
    "secrets_store_secrets",
    "unsafe_hello_world",
    "flagship",
    "worker_loaders",
    "ratelimits",
    "vpc_services",
    "vpc_networks",
    "python_modules",
  ];
  const removed = [];
  for (const field of invalidTopLevel) {
    if (cfg[field] !== undefined) {
      delete cfg[field];
      removed.push(field);
    }
  }

  // Strip non-standard sub-fields from "dev" block
  if (cfg.dev && typeof cfg.dev === "object") {
    const validDevFields = new Set(["ip", "port", "inspector_port", "local_protocol", "upstream_protocol", "host"]);
    for (const key of Object.keys(cfg.dev)) {
      if (!validDevFields.has(key)) {
        delete cfg.dev[key];
        removed.push(`dev.${key}`);
      }
    }
    if (Object.keys(cfg.dev).length === 0) {
      delete cfg.dev;
      removed.push("dev (emptied)");
    }
  }

  // Add nodejs_compat so process.env works in Cloudflare Workers at runtime
  if (!cfg.compatibility_flags) cfg.compatibility_flags = [];
  if (!cfg.compatibility_flags.includes("nodejs_compat")) {
    cfg.compatibility_flags.push("nodejs_compat");
  }
  writeFileSync(pagesWranglerPath, JSON.stringify(cfg, null, 2));
  if (removed.length > 0) {
    console.log(`✓ Cleaned dist/client/wrangler.json (removed: ${removed.join(", ")})`);
  } else {
    console.log("✓ dist/client/wrangler.json already clean");
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
export {`;
  workerCode = workerCode.replace(initCallMatch[0], injection);
  workerCode = workerCode.replace(/\bserver as default\b/, "__patchedServer as default");
  console.log("✓ dist/client/_worker.js patched (CF env injection)");
} else {
  console.warn("⚠ Could not find export marker in _worker.js — CF env patch skipped");
}

writeFileSync("dist/client/_worker.js", polyfill + workerCode);
console.log("✓ dist/client/_worker.js ready (with MessageChannel polyfill)");
