import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {import.meta.env.DEV && error.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// CSP nonce (13 Sep 2026 — Content-Security-Policy moved from Report-Only
// to enforcing; see scripts/patch-wrangler.mjs for the full policy and the
// violation data that shaped it).
//
// The worker generates one nonce per request and passes it inward on the
// x-csp-nonce header. Setting it here as router.options.ssr.nonce is all
// that is required: @tanstack/router-core stamps it onto the
// $tsr-stream-barrier inline script (ssr-server.js, attrs.nonce) and
// @tanstack/react-router forwards the same value to React's SSR renderer
// (renderRouterToStream.js), so every inline script we emit carries it.
//
// Server-only by construction. getRouter() runs on both client and server,
// but the import below is inside the server branch so the server entry
// never reaches the client bundle. On the client this is a no-op — the
// nonce is already baked into the HTML the server sent, and the client
// re-reads it from <meta property="csp-nonce"> via the framework's own
// ssr-client hydration path.
// import.meta.env.SSR is replaced with a literal by Vite at build time, so
// this whole branch — and the server-only import it guards — is statically
// eliminated from the client bundle. A runtime `typeof window` check would
// NOT achieve that: the import would still be emitted and bundled.
// Verified after build by grepping dist/client for getRequestHeader.
// async is safe and intentional: the framework's server entry does
// `router = await entries.routerEntry.getRouter()`, so returning a promise
// is part of the supported contract (verified in the built server output).
export const getRouter = async () => {
  let nonce: string | undefined;
  if (import.meta.env.SSR) {
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      nonce = getRequestHeader("x-csp-nonce") || undefined;
    } catch {
      // Never throw out of router construction over a header read — a
      // missing nonce yields a page whose inline script is blocked (fails
      // closed, loudly visible) rather than one that silently runs
      // unprotected.
      nonce = undefined;
    }
  }

  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
    ...(nonce ? { ssr: { nonce } } : {}),
  });

  return router;
};
