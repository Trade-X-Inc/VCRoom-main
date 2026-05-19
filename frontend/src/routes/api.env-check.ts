import { createServerFn } from "@tanstack/react-start";

export const checkEnv = createServerFn({ method: "POST" })
  .handler(async () => {
    const patterns: Record<string, string> = {};

    // Pattern 1: process.env
    patterns["process.OPENAI"] = process.env.OPENAI_API_KEY ? "present" : "missing";
    patterns["process.SERVICE_ROLE"] = process.env.SUPABASE_SERVICE_ROLE_KEY ? "present" : "missing";
    patterns["process.SUPABASE_URL"] = process.env.SUPABASE_URL ? "present" : "missing";

    // Pattern 2: globalThis direct
    patterns["global.OPENAI"] = (globalThis as any).OPENAI_API_KEY ? "present" : "missing";
    patterns["global.SERVICE_ROLE"] = (globalThis as any).SUPABASE_SERVICE_ROLE_KEY ? "present" : "missing";
    patterns["global.SUPABASE_URL"] = (globalThis as any).SUPABASE_URL ? "present" : "missing";

    // Pattern 3: globalThis.process
    patterns["gprocess.OPENAI"] = (globalThis as any).process?.env?.OPENAI_API_KEY ? "present" : "missing";
    patterns["gprocess.SERVICE_ROLE"] = (globalThis as any).process?.env?.SUPABASE_SERVICE_ROLE_KEY ? "present" : "missing";

    // Pattern 4: globalThis.env
    patterns["genv.OPENAI"] = (globalThis as any).env?.OPENAI_API_KEY ? "present" : "missing";
    patterns["genv.SERVICE_ROLE"] = (globalThis as any).env?.SUPABASE_SERVICE_ROLE_KEY ? "present" : "missing";

    // Pattern 5: all non-standard globalThis keys
    const skip = new Set([
      "undefined","NaN","Infinity","Object","Function","Array","String",
      "Boolean","Number","Symbol","BigInt","Math","Date","RegExp","Error",
      "Map","Set","WeakMap","WeakSet","Promise","Proxy","Reflect","JSON",
      "parseInt","parseFloat","isNaN","isFinite","decodeURI","encodeURI",
      "console","setTimeout","clearTimeout","setInterval","clearInterval",
      "fetch","Request","Response","Headers","URL","URLSearchParams",
      "TextEncoder","TextDecoder","crypto","performance","navigator",
      "location","self","globalThis","structuredClone","queueMicrotask",
      "atob","btoa","ReadableStream","WritableStream","TransformStream",
      "CompressionStream","DecompressionStream","Event","EventTarget",
      "AbortController","AbortSignal","FormData","Blob","File",
      "FileReader","FileList","Worker","WebSocket","Cache","CacheStorage",
      "caches","indexedDB","IDBFactory",
    ]);
    const gKeys = Object.keys(globalThis as any).filter(k => !skip.has(k));
    patterns["globalThis_custom_keys"] = gKeys.join(", ") || "none";

    return patterns;
  });
