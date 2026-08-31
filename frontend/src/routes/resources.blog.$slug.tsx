import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getPostBySlug, type BlogPostWithContent } from "@/lib/notion-blog";

// Public site rebuild, 31 Aug 2026 — blog post detail page. Same
// exemption as resources.blog.index.tsx: real internal work per
// instruction, not a Figma page (LENGDONPUBLIC-NEW has no post-detail
// page at all, only the index listing — see DELETED-PUBLIC-ROUTES.md).
// Rebuilt from the pre-existing blog.$slug.tsx (real Notion-backed
// implementation, same getPostBySlug() call), restyled to the new
// design's typography/color tokens (Geist/Inter, #0a2540) rather than
// the old Syne/purple v1 tokens, so it reads as one system with the
// rest of the rebuilt site.

export const Route = createFileRoute("/resources/blog/$slug")({
  head: ({ loaderData, params }) => {
    const post = loaderData as BlogPostWithContent | null;
    if (!post) return { meta: [{ title: "Post not found — Lengdon Blog" }] };
    const url = `https://lengdon.com/resources/blog/${params.slug}`;
    return {
      meta: [
        { title: `${post.seoTitle || post.title} — Lengdon Blog` },
        { name: "description", content: post.seoDescription || post.excerpt },
        { property: "og:title", content: post.seoTitle || post.title },
        { property: "og:description", content: post.seoDescription || post.excerpt },
        { property: "og:url", content: url },
        ...(post.coverImage ? [{ property: "og:image", content: post.coverImage }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  loader: ({ params }) => getPostBySlug({ data: { slug: params.slug } }),
  component: BlogArticle,
});

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function BlogArticle() {
  const post = Route.useLoaderData() as BlogPostWithContent | null;

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <main id="main-content" className="mx-auto max-w-[720px] px-6 py-32 text-center">
          <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[32px] mb-4">Article not found</h1>
          <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] mb-8">This post doesn't exist or hasn't been published yet.</p>
          <Link to="/resources/blog" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="inline-block bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] px-8 py-3.5 transition-colors duration-200">
            ← All articles
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content" className="mx-auto max-w-[720px] px-6 py-16 md:py-24">
        <Link to="/resources/blog" style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="inline-flex items-center gap-1.5 text-[13px] text-[#0a2540] hover:opacity-70 mb-10 transition-opacity">
          ← All articles
        </Link>

        <div className="mb-12">
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <span key={tag} style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[11px] tracking-[1px] uppercase px-3 py-1 bg-[#f8f9fb] text-[#0a2540] border border-[#e6e9ef]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold tracking-[-1px] leading-[1.1] mb-6 text-[#0a2540] text-[32px] sm:text-[44px]">
            {post.title}
          </h1>

          {post.excerpt && (
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[18px] text-[#425466] mb-8 leading-[1.6]">{post.excerpt}</p>
          )}

          {post.coverImage && (
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-64 md:h-80 object-cover mb-8"
              loading="eager"
            />
          )}

          <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="flex flex-wrap items-center gap-6 text-[13px] text-[#94a3b8] border-t border-[#e6e9ef] pt-6">
            <span>By {post.author}{post.author.includes("Lengdon") ? "" : ", Lengdon"}</span>
            <span>{formatDate(post.publishDate)}</span>
            <span>{post.readingTime}</span>
          </div>
        </div>

        <article
          className="prose prose-sm sm:prose-lg max-w-none overflow-x-hidden
            prose-headings:font-semibold prose-headings:text-[#0a2540] prose-headings:tracking-tight
            prose-h1:text-[32px] prose-h2:text-[22px] prose-h2:mt-10 prose-h3:text-[18px]
            prose-p:text-[#425466] prose-p:leading-relaxed
            prose-li:text-[#425466]
            prose-a:text-[#0a2540] prose-a:no-underline hover:prose-a:underline
            prose-strong:text-[#0a2540]
            prose-blockquote:border-[#0a2540] prose-blockquote:text-[#425466]
            prose-code:text-[#0a2540] prose-code:bg-[#f8f9fb] prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-[#0a2540] prose-pre:text-white
            prose-hr:border-[#e6e9ef]
            [&_figure]:my-6 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-[#94a3b8]"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        <div className="mt-16 p-8 bg-[#f8f9fb] border border-[#e6e9ef] text-center">
          <p style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="text-[#0a2540] mb-2 text-[17px] font-semibold">Ready to close your first transaction?</p>
          <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] mb-6 text-[14px]">
            Join founders and investors already using Lengdon to run a structured close.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] px-8 py-3.5 transition-colors duration-200">
              Get started free →
            </Link>
            <Link to="/resources/blog" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-[#e6e9ef] hover:border-[#0a2540]/30 text-[#425466] text-[14px] px-8 py-3.5 transition-all duration-200">
              ← More articles
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
