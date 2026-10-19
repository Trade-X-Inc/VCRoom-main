// Bundles scripts/email-assets.ts with esbuild (already installed with Vite) and runs it. Offline: sends nothing.
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "email-assets-"));
const out = join(dir, "email-assets.mjs");
try {
  await build({
    entryPoints: [new URL("./email-assets.ts", import.meta.url).pathname],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: out,
    logLevel: "error",
    define: { "import.meta.dirname": JSON.stringify(new URL(".", import.meta.url).pathname) },
  });
  const r = spawnSync(process.execPath, [out, ...process.argv.slice(2)], { stdio: "inherit" });
  process.exitCode = r.status ?? 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
