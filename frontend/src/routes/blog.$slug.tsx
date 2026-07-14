import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Clock, Calendar, User } from "lucide-react";
import { getPostBySlug, type BlogPostWithContent } from "@/lib/notion-blog";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ loaderData }) => {
    const post = loaderData as BlogPostWithContent | null;
    if (!post) return { meta: [{ title: "Post not found — Hockystick Blog" }] };
    return {
      meta: [
        { title: `${post.seoTitle || post.title} — Hockystick Blog` },
        { name: "description", content: post.seoDescription || post.excerpt },
        { property: "og:title", content: post.seoTitle || post.title },
        { property: "og:description", content: post.seoDescription || post.excerpt },
        ...(post.coverImage ? [{ property: "og:image", content: post.coverImage }] : []),
      ],
    };
  },
  loader: ({ params }) => getPostBySlug({ data: { slug: params.slug } }),
  component: BlogArticle,
});

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function BlogArticle() {
  const post = Route.useLoaderData() as BlogPostWithContent | null;

  if (!post) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 sm:px-6 py-32 text-center">
          <h1 className="text-3xl font-bold mb-4">Article not found</h1>
          <p className="text-muted-foreground mb-8">This post doesn't exist or hasn't been published yet.</p>
          <Link to="/blog">
            <Button className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to blog</Button>
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-16 md:py-24">
        {/* Back */}
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-brand hover:opacity-80 font-medium mb-10 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> All articles
        </Link>

        {/* Header block */}
        <div className="mb-12">
          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs font-medium px-3 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6 text-gray-900" style={{ fontFamily: "Syne, sans-serif" }}>
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">{post.excerpt}</p>
          )}

          {/* Cover */}
          {post.coverImage && (
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-64 md:h-80 object-cover rounded-2xl mb-8"
              loading="eager"
            />
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 border-t border-gray-200 pt-6">
            <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" />By {post.author}{post.author.includes("Hockystick") ? "" : ", Hockystick"}</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(post.publishDate)}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{post.readingTime}</span>
          </div>
        </div>

        {/* Content */}
        <article
          className="prose prose-sm sm:prose-lg max-w-none overflow-x-hidden
            prose-headings:font-bold prose-headings:text-gray-900 prose-headings:tracking-tight
            prose-h1:text-4xl prose-h2:text-2xl prose-h2:mt-10 prose-h3:text-xl
            prose-p:text-gray-700 prose-p:leading-relaxed
            prose-li:text-gray-700
            prose-a:text-brand prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900
            prose-blockquote:border-brand prose-blockquote:text-gray-600
            prose-code:text-purple-700 prose-code:bg-purple-50 prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-gray-950 prose-pre:text-gray-100
            prose-hr:border-gray-200
            prose-img:rounded-xl
            [&_.callout]:flex [&_.callout]:gap-3 [&_.callout]:p-4 [&_.callout]:rounded-xl [&_.callout]:bg-purple-50 [&_.callout]:border [&_.callout]:border-purple-200 [&_.callout]:my-6
            [&_figure]:my-6 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-gray-500"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {/* Footer CTA */}
        <div className="mt-16 p-8 rounded-2xl bg-purple-50 border border-purple-200 text-center">
          <p className="text-gray-900 mb-2 text-lg font-semibold">Ready to raise smarter?</p>
          <p className="text-gray-600 mb-6 text-sm">
            Join founders and investors already using Hockystick to close deals faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/sign-up" search={{ role: "founder" } as any}>
              <Button className="gap-2 w-full sm:w-auto">Get started free <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link to="/blog">
              <Button variant="outline" className="gap-2 w-full sm:w-auto"><ArrowLeft className="h-4 w-4" /> More articles</Button>
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
