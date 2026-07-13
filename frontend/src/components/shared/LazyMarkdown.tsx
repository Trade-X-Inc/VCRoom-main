import { lazy, Suspense, useEffect, useState } from "react";

// react-markdown and its remark/micromark dependency tree is ~350KB of
// browser-only rendering code. It is externalized from the CF worker bundle
// (scripts/patch-wrangler.mjs), so it must NEVER be imported during SSR.
// This wrapper guarantees that: it renders plain text until the component
// has mounted on the client, then swaps in the real markdown renderer.
const ReactMarkdown = lazy(() => import("react-markdown"));

export function Markdown({ children }: { children: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const plain = <div className="whitespace-pre-wrap">{children}</div>;
  if (!mounted) return plain;
  return (
    <Suspense fallback={plain}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </Suspense>
  );
}
