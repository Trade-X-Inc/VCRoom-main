import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
const __vite_import_meta_env__ = {};
const checkAIKeys_createServerFn_handler = createServerRpc({
  id: "157f76e85df17cf0242a7d5c8036d366db569f6a04eeaffd5e9d8f9789563b44",
  name: "checkAIKeys",
  filename: "src/routes/api.test-ai.tsx"
}, (opts) => checkAIKeys.__executeServer(opts));
const checkAIKeys = createServerFn({
  method: "GET"
}).handler(checkAIKeys_createServerFn_handler, async () => {
  const sources = {
    processEnv: process.env.OPENAI_API_KEY || "",
    globalThis: globalThis.OPENAI_API_KEY || "",
    importMeta: __vite_import_meta_env__?.OPENAI_API_KEY || "",
    viteEnv: ""
  };
  const key = sources.processEnv || sources.globalThis || sources.importMeta || sources.viteEnv || "";
  const supabaseSources = {
    processEnv: process.env.SUPABASE_URL || "",
    globalThis: globalThis.SUPABASE_URL || ""
  };
  const supabaseKeySources = {
    processEnv: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    globalThis: globalThis.SUPABASE_SERVICE_ROLE_KEY || ""
  };
  return {
    openai: {
      hasKey: !!key,
      keyPrefix: key ? key.slice(0, 8) : "missing",
      sources: {
        processEnv: !!sources.processEnv,
        globalThis: !!sources.globalThis,
        importMeta: !!sources.importMeta,
        viteEnv: false
      }
    },
    supabase: {
      url: {
        found: true,
        sources: {
          processEnv: !!supabaseKeySources.processEnv,
          globalThis: !!supabaseSources.globalThis,
          viteEnv: true
        }
      },
      key: {
        found: true,
        sources: {
          processEnv: !!supabaseKeySources.processEnv,
          globalThis: !!supabaseKeySources.globalThis,
          viteEnv: true
        }
      }
    },
    nodeEnv: "production"
  };
});
export {
  checkAIKeys_createServerFn_handler
};
