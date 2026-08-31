import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";
import { getPublishedPosts, type BlogPost } from "@/lib/notion-blog";

// Public site rebuild, 31 Aug 2026 — pixel-exact LAYOUT port of
// LENGDONPUBLIC-NEW's src/pages/resources/Blog.tsx, WIRED TO REAL DATA.
//
// This is the one page in the rebuild explicitly exempted from "reproduce
// content verbatim" — per instruction, this is real internal work, not
// design work in extent: "the blog page is connected to our notion DB,
// that connection need to be in place and remove the mock data from the
// new UI for the Blog and wire our current notion blogs there."
//
// The source's POSTS array (6 invented articles with fabricated titles,
// dates, and excerpts) is REMOVED, not reproduced — the whole point of
// this page is that it must never show invented posts. Real posts come
// from getPublishedPosts() (src/lib/notion-blog.ts), the same Notion
// integration the pre-existing blog.index.tsx used before deletion.
//
// Layout is pixel-exact from the source: PageHero, category filter row,
// one featured card + a 3-col grid, newsletter strip. The source's
// featured/grid split used a static `featured: true` flag on one mock
// post — with real data, the newest published post is featured and the
// rest fill the grid, which is the only way to reproduce that layout
// shape against a real, unordered-length post list.
//
// Category filter is real and functional (filters by each post's real
// Notion tags), not the source's decorative buttons with no filtering
// logic behind them — a non-functional filter UI wired to real data
// would be worse than the mock it replaces, and building one is well
// within "minimal design work, not design work in extent" for the one
// page explicitly called out for real wiring.

export const Route = createFileRoute("/resources/blog/")({
  loader: () => getPublishedPosts(),
  component: BlogIndex,
});

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function BlogIndex() {
  const posts = Route.useLoaderData() as BlogPost[];
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return ["All", ...Array.from(set)];
  }, [posts]);

  const filtered = useMemo(
    () => (activeCategory === "All" ? posts : posts.filter((p) => p.tags.includes(activeCategory))),
    [posts, activeCategory]
  );

  const [featured, ...rest] = filtered;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Resources · Blog"
          title="INSIGHTS ON"
          titleOutline="PRIVATE CAPITAL."
          subtitle="We write about closing infrastructure, security, compliance, and the structural gaps in private capital transactions."
        />

        {categories.length > 1 && (
          <div className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-8 border-b border-[#e6e9ef] flex gap-3 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{ fontFamily: "'Inter:Medium', sans-serif" }}
                className={`shrink-0 text-[12px] tracking-[0.5px] px-4 py-2 border transition-colors duration-150 ${
                  activeCategory === cat
                    ? "bg-[#0a2540] text-white border-[#0a2540]"
                    : "border-[#e6e9ef] text-[#425466] hover:border-[#0a2540]/30 hover:text-[#0a2540]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          {posts.length === 0 ? (
            <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-center py-24 text-[#94a3b8] text-[15px]">
              No posts published yet — check back soon.
            </div>
          ) : (
            <>
              {featured && (
                <Link
                  to="/resources/blog/$slug"
                  params={{ slug: featured.slug }}
                  className="block border border-[#e6e9ef] p-10 lg:p-14 mb-8 hover:border-[#0a2540]/20 transition-colors group"
                >
                  <div className="flex items-center gap-4 mb-5">
                    {featured.tags[0] && (
                      <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[11px] tracking-[1.5px] uppercase bg-[#0a2540] text-white px-3 py-1">{featured.tags[0]}</span>
                    )}
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">{formatDate(featured.publishDate)}</span>
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">·</span>
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">{featured.readingTime}</span>
                  </div>
                  <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[28px] leading-[1.2] tracking-[-0.5px] mb-4 group-hover:opacity-80 transition-opacity">
                    {featured.title}
                  </h2>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7] max-w-[680px] mb-6">{featured.excerpt}</p>
                  <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] group-hover:underline">Read article →</span>
                </Link>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((post) => (
                  <Link
                    key={post.slug}
                    to="/resources/blog/$slug"
                    params={{ slug: post.slug }}
                    className="border border-[#e6e9ef] p-8 hover:border-[#0a2540]/20 transition-colors group flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {post.tags[0] && (
                        <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] tracking-[1px] uppercase border border-[#e6e9ef] text-[#425466] px-2.5 py-1">{post.tags[0]}</span>
                      )}
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[11px]">{post.readingTime}</span>
                    </div>
                    <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] leading-[1.3] tracking-[-0.3px] mb-3 group-hover:opacity-75 transition-opacity flex-1">
                      {post.title}
                    </h3>
                    <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px] leading-[1.65] mb-5">{post.excerpt.substring(0, 120)}...</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">{formatDate(post.publishDate)}</span>
                      <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] group-hover:underline">Read →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="bg-[#f8f9fb] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[28px] tracking-[-0.8px] mb-2">
                New articles, when they matter.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px]">
                No newsletter cadence. We send when we have something worth reading.
              </p>
            </div>
            <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px]">
              Subscribe from the footer below.
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
