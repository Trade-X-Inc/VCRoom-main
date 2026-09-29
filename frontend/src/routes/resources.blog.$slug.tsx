import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getPostBySlug, getPublishedPosts, type BlogPost, type BlogPostWithContent } from "@/lib/notion-blog";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

// Public site rebuild, 31 Aug 2026 — blog post detail page. Same
// exemption as resources.blog.index.tsx: real internal work per
// instruction, not a Figma page (LENGDONPUBLIC-NEW has no post-detail
// page at all, only the index listing — see DELETED-PUBLIC-ROUTES.md).
// Rebuilt from the pre-existing blog.$slug.tsx (real Notion-backed
// implementation, same getPostBySlug() call), restyled to the new
// design's typography/color tokens (Geist/Inter, #0a2540) rather than
// the old Syne/purple v1 tokens, so it reads as one system with the
// rest of the rebuilt site.

// SEO-005: 8 published posts' Notion "SEO Description" all exceed Google's
// ~155-char meta description guidance (231/218/188/180/178/171/162/161
// chars, verified live against the Notion CMS 27 Sep 2026 — every
// currently-published post was over the limit, none needed leaving out).
// Keyed by slug, checked at render time only — the Notion database itself
// is NOT touched, so a future edit to a post's real SEO Description there
// is invisible to this map until someone removes the corresponding entry.
// "lengdon-beta-features-deal-room-2026"'s trim also drops "thesis
// matching" from the real Notion text — that's a described, live-in-beta
// feature per Foundation §15/§25 (matching/recommendation, prohibited),
// already found and retired/stubbed multiple times elsewhere in this
// codebase (CLAUDE.md §19a/§19i). Not fixed in Notion (out of scope here
// and Notion content stays untouched either way), but this override is
// new code being written, not existing content being left alone — so it
// doesn't reproduce that phrase.
const META_OVERRIDES: Record<string, string> = {
  "investor-grade-data-room-2026":
    "An investor-grade data room in 2026 has six non-negotiable elements and a staged disclosure structure. Here's exactly what to include.",
  "how-investors-make-funding-decisions-stages-2026":
    "Investors make funding decisions in four distinct stages, each with different information requirements and thresholds.",
  "why-ai-pitch-ignored-investors-2026":
    "85% of VCs now use AI tools daily, and 33% of all pitches call themselves AI-powered. Here's what investors are screening for in 2026.",
  "lengdon-vs-docsend-notion-google-drive-2026":
    "DocSend, Notion, and Google Drive each solve part of the fundraising process. Lengdon was built for all of it.",
  "warm-intro-losing-power-fundraising-2026":
    "Warm introductions to VCs still convert at 40% vs 0.5% for cold email. But the information gap that made them necessary is closing.",
  "5-minute-investor-check-before-pitching-2026":
    "After every good VC meeting, investors run a silent 5-minute background check. Most founders fail it without knowing.",
  "lengdon-beta-features-deal-room-2026":
    "Lengdon is live in beta. Explore the deal room features helping founders close rounds faster — AI summaries, investor signals, and due diligence.",
  "remote-investor-trust-deal-room-2026":
    "Physical meetings no longer determine who gets funded. Discover how deal rooms build investor trust and close rounds faster.",
};

export const Route = createFileRoute("/resources/blog/$slug")({
  head: ({ loaderData, params }) => {
    const { post } = (loaderData ?? {}) as { post: BlogPostWithContent | null };
    if (!post) return { meta: [{ title: "Post not found — Lengdon Blog" }] };
    const url = `https://lengdon.com/resources/blog/${params.slug}`;
    const description = META_OVERRIDES[post.slug] ?? (post.seoDescription || post.excerpt);
    return {
      meta: [
        { title: `${post.seoTitle || post.title} — Lengdon Blog` },
        { name: "description", content: description },
        { property: "og:title", content: post.seoTitle || post.title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        ...(post.coverImage ? [{ property: "og:image", content: post.coverImage }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  loader: async ({ params }) => {
    // SEO-017 Phase 1: these two Notion calls have no data dependency on
    // each other at the fetch level (the related-post filter only needs
    // post.slug/post.tags to SELECT from the already-fetched list, not to
    // fetch it) — run them concurrently instead of one after the other.
    const [post, allPosts] = await Promise.all([
      getPostBySlug({ data: { slug: params.slug } }),
      getPublishedPosts(),
    ]);
    if (!post) return { post: null, related: null };
    // SEO-003 — tag-based related post, computed here rather than hand-
    // authored per post: content lives in Notion, not in this repo, so
    // there is no file to add per-post cross-links to. First other
    // published post sharing at least one tag; null (render nothing) if
    // none match, per instruction ("don't force it").
    const related: BlogPost | null =
      allPosts.find((p) => p.slug !== post.slug && p.tags.some((t) => post.tags.includes(t))) ?? null;
    return { post, related };
  },
  component: BlogArticle,
});

// SEO-011: a small, honest tag -> {tool, template} map for a reader-
// service cross-link, not a keyword-stuffing exercise. Picks the first
// matching tag in this priority order; falls back to a broadly relevant
// default pair when no tag matches (e.g. Product Update, GCC Ecosystem, AI).
const RELATED_BY_TAG: Record<string, { toolHref: string; toolLabel: string; templateHref: string; templateLabel: string }> = {
  "Founders": { toolHref: "/tools/cap-table", toolLabel: "Cap Table Builder", templateHref: "/templates", templateLabel: "Due Diligence Checklist" },
  "Investors": { toolHref: "/tools/safe-note", toolLabel: "SAFE Note Calculator", templateHref: "/templates", templateLabel: "Investor Due Diligence Checklist" },
  "Fundraising": { toolHref: "/tools/valuation-calculator", toolLabel: "Valuation Calculator", templateHref: "/templates", templateLabel: "Convertible Note Term Sheet" },
  "Deal Flow": { toolHref: "/tools/cap-table", toolLabel: "Cap Table Builder", templateHref: "/templates", templateLabel: "Mutual NDA" },
};
const DEFAULT_RELATED = { toolHref: "/tools/runway", toolLabel: "Runway Calculator", templateHref: "/templates", templateLabel: "Data Room Index" };
function getRelatedLinks(tags: string[]) {
  for (const t of ["Founders", "Investors", "Fundraising", "Deal Flow"]) {
    if (tags.includes(t)) return RELATED_BY_TAG[t];
  }
  return DEFAULT_RELATED;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function BlogArticle() {
  const { post, related } = Route.useLoaderData() as { post: BlogPostWithContent | null; related: BlogPost | null };

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

  // SEO-004: real field names only (post.excerpt, not post.description;
  // post.publishDate, not post.publishedAt) — dateModified mirrors
  // datePublished since BlogPost carries no separate "last edited" field.
  // Author modeled as Person per Google's structured-data guidance for
  // BlogPosting; post.author is a plain name string either way (falls back
  // to "The Lengdon Team" in notion-blog.ts when Notion has no Author set).
  const postJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt,
    "datePublished": post.publishDate,
    "dateModified": post.publishDate,
    "author": { "@type": "Person", "name": post.author },
    "publisher": { "@id": "https://lengdon.com/#organization" },
    "url": `https://lengdon.com/resources/blog/${post.slug}`,
    ...(post.coverImage ? { "image": post.coverImage } : {}),
  });

  // SEO-010 (AEO pass): BreadcrumbList JSON-LD. 4-level — /resources and
  // /resources/blog are both real hub pages; the post title is dynamic.
  const breadcrumbJsonLdString = breadcrumbJsonLd([
    { name: "Home", url: "https://lengdon.com/" },
    { name: "Resources", url: "https://lengdon.com/resources" },
    { name: "Blog", url: "https://lengdon.com/resources/blog" },
    { name: post.title },
  ]);

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: postJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLdString }} />
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

          <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="flex flex-wrap items-center gap-6 text-[13px] text-[#64748b] border-t border-[#e6e9ef] pt-6">
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
            [&_figure]:my-6 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-[#64748b]"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {related && (
          <div className="mt-12 pt-6 border-t border-[#e6e9ef]">
            <Link
              to="/resources/blog/$slug"
              params={{ slug: related.slug }}
              style={{ fontFamily: "'Inter:Medium', sans-serif" }}
              className="text-[13px] text-[#0a2540] underline hover:opacity-70 transition-opacity"
            >
              Related: {related.title} →
            </Link>
          </div>
        )}

        {(() => {
          const rel = getRelatedLinks(post.tags);
          return (
            <div className={related ? "mt-4" : "mt-12 pt-6 border-t border-[#e6e9ef]"}>
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[11px] tracking-[1px] uppercase text-[#64748b] mb-2">Related tools & templates</div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <Link to={rel.toolHref as any} style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[13px] text-[#0a2540] underline hover:opacity-70 transition-opacity">{rel.toolLabel}</Link>
                <Link to={rel.templateHref as any} style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[13px] text-[#0a2540] underline hover:opacity-70 transition-opacity">{rel.templateLabel}</Link>
              </div>
            </div>
          );
        })()}

        <div className="mt-16 p-8 bg-[#f8f9fb] border border-[#e6e9ef] text-center">
          <p style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="text-[#0a2540] mb-2 text-[17px] font-semibold">Ready to close your first transaction?</p>
          <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] mb-6 text-[14px]">
            Join founders and investors already using Lengdon to run a structured close.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] px-8 py-3.5 transition-colors duration-200">
              Join the waitlist →
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
