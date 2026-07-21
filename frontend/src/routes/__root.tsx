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
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <p style={{
        color: 'var(--brand)',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 16,
      }}>
        404
      </p>
      <h1 style={{
        color: '#ffffff',
        fontSize: 32,
        fontWeight: 800,
        fontFamily: 'Syne, sans-serif',
        marginBottom: 12,
        textAlign: 'center',
      }}>
        This page doesn't exist
      </h1>
      <p style={{
        color: 'var(--muted-foreground)',
        fontSize: 16,
        marginBottom: 32,
        textAlign: 'center',
        maxWidth: 400,
      }}>
        The link may be broken or the page may have moved.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <a href="/" style={{
          background: 'var(--gradient-brand)',
          color: '#ffffff',
          padding: '10px 24px',
          borderRadius: 8,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 500,
        }}>
          Go home
        </a>
        <a href="/tools" style={{
          background: 'var(--accent)',
          color: '#ffffff',
          padding: '10px 24px',
          borderRadius: 8,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 500,
        }}>
          View tools
        </a>
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
      { title: "Hockystick — Where deals get done" },
      { name: "description", content: "Connect with verified investors. Replace warm intros with manufactured trust. The private fundraising platform for founders and investors." },
      { name: "author", content: "Hockystick" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#6C5CE7" },
      // Open Graph
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Hockystick — Where deals get done" },
      { property: "og:description", content: "Connect with verified investors. Replace warm intros with manufactured trust. The private fundraising platform for founders and investors." },
      { property: "og:url", content: "https://hockystick.app" },
      { property: "og:site_name", content: "Hockystick" },
      { property: "og:image", content: "https://hockystick.app/og-image.png" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Hockystick — Where deals get done" },
      // Twitter / X
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@hockystickapp" },
      { name: "twitter:title", content: "Hockystick — Where deals get done" },
      { name: "twitter:description", content: "Connect with verified investors. Replace warm intros with manufactured trust. Verified deal rooms. AI-powered matching." },
      { name: "twitter:image", content: "https://hockystick.app/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://hockystick.app" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "mask-icon", href: "/mask-icon.svg", color: "#7C3AED" },
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
