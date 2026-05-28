import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Hockystick" },
      { name: "description", content: "Latest insights on fundraising, venture capital, and deal management." },
    ],
  }),
  component: BlogIndex,
});

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  readTime: string;
  category: string;
  excerpt: string;
  image: string | null;
}

const POSTS: BlogPost[] = [
  {
    slug: "why-deal-rooms-replace-email",
    title: "Why Deal Rooms Are Replacing Email for Fundraising",
    date: "May 2026",
    author: "Hockystick Team",
    readTime: "5 min read",
    category: "Fundraising",
    excerpt: "Founders waste 40% of their fundraising time on email management. Here's why the best VCs are moving to structured deal rooms.",
    image: null,
  },
  {
    slug: "ai-due-diligence-2026",
    title: "How AI is Changing Due Diligence in 2026",
    date: "May 2026",
    author: "Hockystick Team",
    readTime: "7 min read",
    category: "AI & VC",
    excerpt: "AI due diligence tools now analyze pitch decks, financials, and market data in minutes. What this means for founders and investors.",
    image: null,
  },
  {
    slug: "seed-fundraising-guide",
    title: "The Complete Seed Fundraising Guide for 2026",
    date: "April 2026",
    author: "Hockystick Team",
    readTime: "12 min read",
    category: "Fundraising",
    excerpt: "Everything you need to know about raising your seed round — from building your investor list to closing your first term sheet.",
    image: null,
  },
  {
    slug: "vc-thesis-matching",
    title: "Thesis-Match: Why Most Founders Pitch the Wrong Investors",
    date: "April 2026",
    author: "Hockystick Team",
    readTime: "6 min read",
    category: "Strategy",
    excerpt: "73% of pitches go to investors who would never invest based on thesis. Here's how to fix your targeting.",
    image: null,
  },
  {
    slug: "deal-room-security",
    title: "Why Your Pitch Deck Needs Bank-Grade Security",
    date: "March 2026",
    author: "Hockystick Team",
    readTime: "4 min read",
    category: "Security",
    excerpt: "Unencrypted pitch decks are a liability. Here's what founders should know about protecting their fundraising documents.",
    image: null,
  },
];

function BlogIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        {/* Header */}
        <div className="max-w-2xl mb-16">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-tight mb-4">
            Insights for Founders & Investors
          </h1>
          <p className="text-xl text-muted-foreground">
            Latest thoughts on fundraising, venture capital, and deal management in the modern era.
          </p>
        </div>

        {/* Blog Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="bg-card border border-border/60 rounded-xl p-6 hover:border-border transition-colors group flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <Badge variant="secondary" className="text-xs">
                  {post.category}
                </Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {post.readTime}
                </span>
              </div>

              <h2 className="text-lg font-semibold mb-2 group-hover:text-brand transition-colors line-clamp-2">
                {post.title}
              </h2>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                {post.excerpt}
              </p>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/60">
                <span>{post.date}</span>
                <span className="inline-flex items-center gap-1 text-brand group-hover:translate-x-0.5 transition-transform">
                  Read article <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 rounded-xl p-12 text-center">
          <h2 className="text-2xl font-semibold mb-3">Stay updated</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Get the latest insights on fundraising and venture capital delivered to your inbox.
          </p>
          <Link to="/waitlist">
            <Button className="gap-2">
              Join our community <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
