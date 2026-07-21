import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { getPublishedPosts, type BlogPost } from "@/lib/notion-blog";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — Hockystick" },
      { name: "description", content: "Latest insights on fundraising, venture capital, and deal management." },
    ],
  }),
  loader: () => getPublishedPosts(),
  component: BlogIndex,
});

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function BlogIndex() {
  const posts = Route.useLoaderData() as BlogPost[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-24 md:py-32">
        {/* Header */}
        <div className="max-w-2xl mb-16">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4" style={{ fontFamily: "Syne, sans-serif" }}>
            Insights for Founders & Investors
          </h1>
          <p className="text-xl text-muted-foreground">
            Insights from building fundraising infrastructure for GCC founders.
            No sponsored content. No PR. What we actually see in the data.
          </p>
        </div>

        {/* Blog Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <p className="text-lg">No posts published yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="border border-[rgba(0,0,0,0.08)] bg-white p-4 sm:p-6 hover:border-brand/30 transition-all group flex flex-col"
              >
                {post.coverImage && (
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                    loading="lazy"
                  />
                )}

                <div className="flex items-start justify-between gap-2 mb-3">
                  {post.tags[0] && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-accent text-brand text-xs font-semibold">
                      {post.tags[0]}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
                    {post.readingTime}
                  </span>
                </div>

                <h2 className="text-base font-semibold mb-2 group-hover:text-brand transition-colors line-clamp-2">
                  {post.title}
                </h2>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/60">
                  <span>By {post.author} · {formatDate(post.publishDate)}</span>
                  <span className="inline-flex items-center gap-1 text-brand group-hover:translate-x-0.5 transition-transform">
                    Read article <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 bg-accent border border-border rounded-lg p-12 text-center">
          <h2 className="text-2xl font-semibold mb-3">Ready to raise?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Build a verified profile and start closing deals — from first meeting to signed agreement, in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/sign-up" search={{ role: "founder" } as any}>
              <Button className="gap-2">
                Create founder account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/waitlist">
              <Button variant="outline" className="gap-2">
                Join our newsletter
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
