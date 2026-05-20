import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const checkEnv = createServerFn({ method: "POST" })
  .handler(async () => {
    const results: Record<string, string> = {};

    // globalThis.Cloudflare deep check
    const cf = (globalThis as any).Cloudflare;
    results["cf_keys"] = Object.keys(cf || {}).join(", ") || "none";
    results["cf_env_keys"] = Object.keys(cf?.env || {}).join(", ") || "none";

    // getRequest() — the real request object in this TanStack Start version
    try {
      const req = getRequest();
      results["req_type"] = req?.constructor?.name || "unknown";
      results["req_keys"] = Object.keys(req || {}).join(", ").slice(0, 200) || "none";
      const reqAny = req as any;
      results["req_cf_keys"] = Object.keys(reqAny?.cf || {}).join(", ").slice(0, 200) || "none";
      results["req_env_keys"] = Object.keys(reqAny?.env || {}).join(", ").slice(0, 200) || "none";
      results["req_cloudflare_keys"] = Object.keys(reqAny?.cloudflare || {}).join(", ").slice(0, 200) || "none";
      results["req_ctx_keys"] = Object.keys(reqAny?.ctx || reqAny?.context || {}).join(", ").slice(0, 200) || "none";
      results["req_url"] = req?.url?.slice(0, 50) || "none";
    } catch (e) {
      results["req_error"] = String(e).slice(0, 100);
    }

    // Other globalThis patterns
    const gAny = globalThis as any;
    results["has__env__"] = gAny.__env__ ? "yes" : "no";
    results["has_env"] = gAny.env ? "yes" : "no";
    results["has_CF_BINDINGS"] = gAny.CF_BINDINGS ? "yes" : "no";
    results["scheduler_keys"] = Object.keys(gAny.scheduler || {}).join(", ") || "none";

    // Non-standard globalThis keys
    const standardKeys = new Set([
      "undefined","NaN","Infinity","Object","Function","Array","String","Boolean",
      "Number","Symbol","BigInt","Math","Date","RegExp","Error","Map","Set",
      "WeakMap","WeakSet","Promise","Proxy","Reflect","JSON","parseInt","parseFloat",
      "isNaN","isFinite","decodeURI","encodeURI","console","setTimeout","clearTimeout",
      "setInterval","clearInterval","fetch","Request","Response","Headers","URL",
      "URLSearchParams","TextEncoder","TextDecoder","crypto","performance","navigator",
      "location","self","globalThis","structuredClone","queueMicrotask","atob","btoa",
      "ReadableStream","WritableStream","TransformStream","CompressionStream",
      "DecompressionStream","Event","EventTarget","AbortController","AbortSignal",
      "FormData","Blob","File","Worker","WebSocket","Cache","CacheStorage","caches",
      "global","process","Buffer","origin","Cloudflare","scheduler",
      "ServiceWorkerGlobalScope","clearImmediate","setImmediate","Performance",
      "PerformanceEntry","PerformanceMark","PerformanceMeasure","PerformanceObserver",
      "PerformanceObserverEntryList","PerformanceResourceTiming","MessageChannel",
    ]);
    results["new_global_keys"] = Object.keys(gAny).filter(k => !standardKeys.has(k)).join(", ") || "none";

    // process deep check
    results["process_keys"] = Object.keys(gAny.process || {}).join(", ").slice(0, 200) || "none";
    results["process_env_keys"] = Object.keys(gAny.process?.env || {}).join(", ").slice(0, 200) || "none";

    return results;
  });
