import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    envDir: "..",
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    resolve: {
      alias: {
        // react-dom/server.browser uses MessageChannel which is absent in
        // Cloudflare Workers. The Node.js variant uses pipeableStream
        // which works with nodejs_compat.
        "react-dom/server.browser": "react-dom/server.node",
      },
    },
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
      hmr: {
        clientPort: 443,
        protocol: "wss",
      },
      headers: {
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
    },
  },
});