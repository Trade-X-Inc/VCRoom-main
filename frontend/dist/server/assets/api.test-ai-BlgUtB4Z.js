import { jsx } from "react/jsx-runtime";
import { d as Route } from "./router-BRauOI85.js";
import "@tanstack/react-router";
import "@tanstack/react-query";
import "react";
import "@supabase/supabase-js";
import "sonner";
import "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "clsx";
const SplitComponent = function TestAI() {
  const data = Route.useLoaderData();
  const output = {
    serverSide: data,
    clientSide: {
      VITE_OPENAI_API_KEY: "missing",
      hasKey: false
    }
  };
  return /* @__PURE__ */ jsx("pre", { style: {
    padding: 24,
    fontFamily: "monospace",
    fontSize: 14,
    background: "#f8f8f8",
    minHeight: "100vh",
    margin: 0,
    whiteSpace: "pre-wrap"
  }, children: JSON.stringify(output, null, 2) });
};
export {
  SplitComponent as component
};
