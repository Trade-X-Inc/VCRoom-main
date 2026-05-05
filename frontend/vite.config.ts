import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    envDir: "..",
    envPrefix: ["VITE_", "NEXT_PUBLIC_"]
  }
});