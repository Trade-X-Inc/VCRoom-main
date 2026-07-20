import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type * as Recharts from "recharts";

// recharts + its d3 dependency tree is ~825KB uncompressed (~275KB gz) of
// browser-only SVG-charting code that was being bundled into the CF worker (SSR)
// — the single largest removable dependency in _worker.js. It is now
// externalized from the worker (scripts/patch-wrangler.mjs) and must NEVER be
// reached during SSR. This is the ONE client-only boundary every chart goes
// through: the whole recharts module is loaded via dynamic import inside a
// render prop, so the SSR graph never statically imports recharts.
//
// Pattern (same intent as LazyMarkdown.tsx): a call site passes a `render`
// function that receives the recharts module and returns the chart tree. That
// function is only ever invoked on the client after recharts has loaded, so the
// recharts primitives are never referenced during SSR. Charts already live
// inside ResponsiveContainer (client width-measurement, no meaningful SSR
// output), so gating on mount has no visible effect beyond a brief placeholder.
//
// No chart behavior changes: the exact same recharts primitives compose the same
// trees — they just come from the module argument instead of a static import.

const loadRecharts = () => import("recharts");

function makeChartHost(mod: typeof Recharts) {
  return function ChartHost({ render }: { render: (r: typeof Recharts) => ReactNode }) {
    return <>{render(mod)}</>;
  };
}

const ChartHost = lazy(() => loadRecharts().then((mod) => ({ default: makeChartHost(mod) })));

/**
 * Render a recharts chart, client-only. Usage:
 *
 *   <LazyChart height={240} render={(R) => (
 *     <R.ResponsiveContainer width="100%" height="100%">
 *       <R.AreaChart data={data}>…</R.AreaChart>
 *     </R.ResponsiveContainer>
 *   )} />
 *
 * `height` sizes the placeholder so layout doesn't jump before the chart mounts.
 */
export function LazyChart({
  render,
  height,
  className,
}: {
  render: (r: typeof Recharts) => ReactNode;
  height?: number | string;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const placeholder = <div className={className} style={{ height: height ?? "100%", width: "100%" }} />;
  if (!mounted) return placeholder;
  return (
    <Suspense fallback={placeholder}>
      <ChartHost render={render} />
    </Suspense>
  );
}
