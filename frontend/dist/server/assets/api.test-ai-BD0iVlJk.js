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
const checkAIKeys_createServerFn_handler = createServerRpc({
  id: "157f76e85df17cf0242a7d5c8036d366db569f6a04eeaffd5e9d8f9789563b44",
  name: "checkAIKeys",
  filename: "src/routes/api.test-ai.tsx"
}, (opts) => checkAIKeys.__executeServer(opts));
const checkAIKeys = createServerFn({
  method: "GET"
}).handler(checkAIKeys_createServerFn_handler, async () => {
  const fromProcessEnv = process.env.OPENAI_API_KEY || "";
  const fromGlobalThis = globalThis.OPENAI_API_KEY || "";
  const key = fromProcessEnv || fromGlobalThis;
  const supabaseUrl = process.env.SUPABASE_URL || globalThis.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || globalThis.SUPABASE_SERVICE_ROLE_KEY || "";
  return {
    hasKey: !!key,
    keyPrefix: key ? key.slice(0, 8) : "missing",
    source: fromProcessEnv ? "process.env" : fromGlobalThis ? "globalThis" : "not found",
    supabaseUrl: !!supabaseUrl,
    supabaseKey: !!supabaseKey,
    nodeEnv: "production"
  };
});
export {
  checkAIKeys_createServerFn_handler
};
