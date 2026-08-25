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
          background: '#7C3AED',
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

// Single source of structured data for the site shell: one SoftwareApplication
// (the only one — the landing page must NOT inject a second) plus the
// Organization entity, combined in one @graph. Price is asserted honestly:
// the product is free during beta, so the offer says 0 — never a price that
// isn't actually charged.
const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "Lengdon",
      "url": "https://lengdon.com",
      "description": "A fundraising platform where founders and investors meet, run due diligence, hold structured interviews, negotiate terms, and close deals — entirely in-platform.",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD", "description": "Free during beta" },
      "creator": { "@id": "https://lengdon.com/#organization" },
    },
    {
      "@type": "Organization",
      "@id": "https://lengdon.com/#organization",
      "name": "Lengdon",
      // legalName removed 17 Aug 2026 — Foundation Document §20.7 confines the
      // entity name to Terms, where it carries the "(under incorporation)"
      // qualifier. A bare legalName in machine-readable structured data asserts
      // a completed incorporation without the qualifier that makes it true.
      "url": "https://lengdon.com",
      "logo": "https://lengdon.com/apple-touch-icon.png",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "DIFC FinTech Hive",
        "addressLocality": "Dubai",
        "addressCountry": "AE",
      },
    },
  ],
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Lengdon — Every deal leaves a record that holds" },
      { name: "description", content: "A deal room, a diligence checklist, and a term sheet that all point to the same reference number." },
      { name: "author", content: "Lengdon" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#F5F4F1" },
      // Open Graph — root-level fallback. Individual routes (the homepage,
      // /pricing) override og:title/og:description in their own head(); this
      // is what unmatched routes and social crawlers see if they don't.
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Lengdon — Every deal leaves a record that holds" },
      { property: "og:description", content: "A deal room, a diligence checklist, and a term sheet that all point to the same reference number." },
      { property: "og:url", content: "https://lengdon.com" },
      { property: "og:site_name", content: "Lengdon" },
      { property: "og:image", content: "https://lengdon.com/og-image.png" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Lengdon — every deal leaves a record that holds." },
      // Twitter / X
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@lengdondotcom" },
      { name: "twitter:title", content: "Lengdon — Every deal leaves a record that holds" },
      { name: "twitter:description", content: "A deal room, a diligence checklist, and a term sheet that all point to the same reference number." },
      { name: "twitter:image", content: "https://lengdon.com/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // No site-wide canonical here: a root-level canonical pointing at the
      // apex made EVERY subpage (/pricing, /tools/*, /blog/*) declare itself
      // a duplicate of the homepage — actively harmful for indexing. Routes
      // that want a canonical set their own (the landing page does).
      // SVG icon and mask-icon intentionally omitted here (25 Aug 2026 brand
      // refresh): the new mark's only source is a raster PNG/favicon file
      // provided directly by the founder — no vector source exists to derive
      // an accurate favicon.svg or mask-icon.svg from, and approximating one
      // risked introducing shape drift from the real asset. The PNG/ICO set
      // below is generated directly from that exact source file, pixel-
      // accurate. mask-icon.svg was also a dead reference before this change
      // (file never existed in public/) — removed rather than left 404ing.
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/favicon-512x512.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-192x192.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
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
