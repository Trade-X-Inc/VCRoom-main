import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/news")({
  head: () => ({
    meta: [{ title: "Market News — Hockystick" }],
  }),
  component: News,
});

interface NewsArticle {
  title: string;
  source: string;
  date: string;
  description: string;
  link: string;
  category?: string;
}

interface NewsResource {
  title: string;
  description: string;
  link: string;
  source: string;
}

const curatedResources: NewsResource[] = [
  {
    title: "TechCrunch Startups",
    description: "Latest startup news, funding rounds, and tech industry updates",
    link: "https://techcrunch.com/startups/",
    source: "TechCrunch",
  },
  {
    title: "Crunchbase News",
    description: "Funding announcements, acquisitions, and company intelligence",
    link: "https://news.crunchbase.com/",
    source: "Crunchbase",
  },
  {
    title: "The Information",
    description: "Exclusive reporting on technology and venture capital",
    link: "https://www.theinformation.com/",
    source: "The Information",
  },
  {
    title: "Axios Pro Rata",
    description: "Daily venture capital news and investment updates",
    link: "https://www.axios.com/pro/pro-rata",
    source: "Axios",
  },
  {
    title: "PitchBook News",
    description: "Market analysis, trends, and deal intelligence",
    link: "https://pitchbook.com/news",
    source: "PitchBook",
  },
  {
    title: "VentureBeat",
    description: "Technology news covering startups and VC landscape",
    link: "https://venturebeat.com/",
    source: "VentureBeat",
  },
];

function News() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [useFallback, setUseFallback] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    try {
      // Try to fetch from API
      const response = await fetch(
        "https://newsdata.io/api/1/news?apikey=pub_5af3f27b17ba7e47649fb37ac66e6eb56&q=startup+funding+VC&language=en&limit=20"
      );

      if (!response.ok) throw new Error("API failed");

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const formattedArticles = data.results.map((article: any) => ({
          title: article.title,
          source: article.source_id || "News Source",
          date: new Date(article.pubDate).toLocaleDateString(),
          description: article.description || article.content || "Read the full article for details.",
          link: article.link,
          category: article.category?.[0] || "business",
        }));

        setArticles(formattedArticles);
        setUseFallback(false);
        toast.success("News updated successfully");
      } else {
        throw new Error("No results");
      }
    } catch (error) {
      console.error("Failed to fetch news:", error);
      setUseFallback(true);
      toast.info("Using curated news sources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filteredArticles =
    activeTab === "all"
      ? articles
      : articles.filter(
          (a) =>
            a.category?.toLowerCase().includes(activeTab.toLowerCase()) ||
            a.title.toLowerCase().includes(activeTab.toLowerCase())
        );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Startup & VC News</h1>
          <p className="text-muted-foreground">
            Latest funding rounds and ecosystem updates
          </p>
        </div>
        <Button
          onClick={fetchNews}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {useFallback && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-200">
            📰 Live news feed coming soon — follow these sources for daily updates.
          </p>
        </div>
      )}

      {!useFallback && articles.length > 0 ? (
        <>
          {/* Filter Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="funding">Funding Rounds</TabsTrigger>
              <TabsTrigger value="business">VC News</TabsTrigger>
              <TabsTrigger value="startup">Startups</TabsTrigger>
              <TabsTrigger value="tech">Tech</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {filteredArticles.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-4">
                  {filteredArticles.map((article, i) => (
                    <a
                      key={i}
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-card border border-border/60 rounded-xl p-5 hover:border-border transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                          {article.source}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
                      </div>

                      <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-brand transition-colors">
                        {article.title}
                      </h3>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {article.description}
                      </p>

                      <div className="text-xs text-muted-foreground">
                        {article.date}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No articles found for this category.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <>
          {/* Curated Resources Fallback */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Curated News Sources</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {curatedResources.map((resource, i) => (
                <a
                  key={i}
                  href={resource.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-card border border-border/60 rounded-xl p-5 hover:border-border transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                      Resource
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
                  </div>

                  <h3 className="font-semibold mb-2 group-hover:text-brand transition-colors">
                    {resource.title}
                  </h3>

                  <p className="text-sm text-muted-foreground mb-3">
                    {resource.description}
                  </p>

                  <div className="text-xs text-muted-foreground">
                    {resource.source}
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-500/20 rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Follow these sources for the latest startup and VC news. Live news integration coming soon.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
