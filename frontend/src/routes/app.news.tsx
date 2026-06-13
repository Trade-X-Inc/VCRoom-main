import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { fetchAllNews, type NewsItem } from "@/lib/news-fetcher";

export const Route = createFileRoute("/app/news")({
  head: () => ({ meta: [{ title: "Market Intelligence — Hockystick" }] }),
  component: News,
});

const SOURCES = ["All", "TechCrunch", "Sifted", "VentureBeat", "WIRED", "Hacker News"];

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-xl bg-card border border-border/60 hover:border-border hover:bg-accent/40 transition-all group"
    >
      <div className="flex items-center justify-between mb-2.5">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: item.sourceColor + "20", color: item.sourceColor }}
        >
          {item.source}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{item.timeAgo}</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
        </div>
      </div>

      <h3 className="text-sm font-medium leading-snug mb-2 line-clamp-2 group-hover:text-brand transition-colors">
        {item.title}
      </h3>

      {item.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
      )}

      {item.score != null && (
        <div className="text-xs text-orange-500 font-medium mt-1">▲ {item.score} points</div>
      )}
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/60 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-4 w-20 bg-muted rounded-full" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
      <div className="h-4 bg-muted rounded w-full mb-2" />
      <div className="h-4 bg-muted rounded w-4/5 mb-2" />
      <div className="h-3 bg-muted rounded w-3/5" />
    </div>
  );
}

function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetchAllNews()
      .then(setNews)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const filtered = filter === "All" ? news : news.filter((n) => n.source === filter);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
            Market Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live startup & VC news from TechCrunch, Crunchbase, VentureBeat and Hacker News
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mb-4 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
        📰 More sources and AI-curated summaries coming at public launch. Currently showing live feeds from Hacker News, TechCrunch, Sifted, VentureBeat and WIRED.
      </div>

      {/* Source filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6">
        {SOURCES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === s
                ? "bg-brand text-brand-foreground"
                : "bg-accent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
            {!loading && s !== "All" && (
              <span className="ml-1 opacity-60">
                ({news.filter((n) => n.source === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>No articles found. Try a different source or refresh.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => <NewsCard key={item.id} item={item} />)}
        </div>
      )}

      {!loading && news.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-8">
          {news.length} articles · {[...new Set(news.map((n) => n.source))].join(", ")}
        </p>
      )}
    </div>
  );
}
