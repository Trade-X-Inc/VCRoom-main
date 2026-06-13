import { Outlet, Link, createRootRoute, HeadContent, Scripts, ScrollRestoration } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { setupAuthListener } from "@/lib/auth-store";

// Single auth listener — must run once before any route beforeLoad
if (typeof window !== 'undefined') setupAuthListener();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Hockystick",
  "url": "https://hockystick.app",
  "description": "AI-powered deal rooms for founders raising capital and VCs managing deal flow.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "49", "priceCurrency": "USD" },
  "creator": { "@type": "Organization", "name": "Hockystick", "url": "https://hockystick.app" },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Hockystick — Verified Fundraising for MENA Founders" },
      { name: "description", content: "Connect with verified investors. Replace warm intros with manufactured trust. Built for GCC & MENA startups." },
      { name: "author", content: "Hockystick" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#6C5CE7" },
      // Open Graph
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Hockystick — Verified Fundraising for MENA Founders" },
      { property: "og:description", content: "Connect with verified investors. Replace warm intros with manufactured trust. Built for GCC & MENA startups." },
      { property: "og:url", content: "https://hockystick.app" },
      { property: "og:site_name", content: "Hockystick" },
      { property: "og:image", content: "https://hockystick.app/og-image.png" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Hockystick — Verified Fundraising for MENA Founders" },
      // Twitter / X
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@hockystickapp" },
      { name: "twitter:title", content: "Hockystick — Verified Fundraising for MENA Founders" },
      { name: "twitter:description", content: "Connect with verified investors. Replace warm intros with manufactured trust. Built for GCC & MENA startups." },
      { name: "twitter:image", content: "https://hockystick.app/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://hockystick.app" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "shortcut icon", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Outlet />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
