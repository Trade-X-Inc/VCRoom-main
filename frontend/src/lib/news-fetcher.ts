export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceColor: string;
  publishedAt: string;
  timeAgo: string;
  description?: string;
  score?: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const VC_KEYWORDS = [
  "startup", "funding", "venture", "vc",
  "founder", "raise", "seed", "series a",
  "series b", "series c", "investor", "deal",
  "acquisition", "ipo", "saas", "fintech",
  "ai startup", "pre-seed", "accelerator",
  "incubator", "yc", "y combinator",
  "techcrunch", "crunchbase", "launch",
  "raised", "closes", "million", "billion",
  "backed", "led round", "valuation",
];

export async function fetchHackerNews(): Promise<NewsItem[]> {
  try {
    const ids: number[] = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json"
    ).then((r) => r.json());

    const stories = await Promise.all(
      ids.slice(0, 100).map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
          .then((r) => r.json())
          .catch(() => null)
      )
    );

    return stories
      .filter(
        (s: any) =>
          s?.url &&
          s?.title &&
          VC_KEYWORDS.some((k) => s.title.toLowerCase().includes(k))
      )
      .slice(0, 20)
      .map((s: any) => {
        const iso = new Date(s.time * 1000).toISOString();
        return {
          id: String(s.id),
          title: s.title,
          url: s.url,
          source: "Hacker News",
          sourceColor: "#FF6600",
          publishedAt: iso,
          timeAgo: timeAgo(iso),
          score: s.score,
        };
      });
  } catch (e) {
    console.error("[News] HN failed:", e);
    return [];
  }
}

// TODO: move RSS fetches to createServerFn to fix CORS reliably

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

// Uses rss2json directly — avoids double-proxy overhead
async function fetchRSSviaCORS(
  feedUrl: string,
  source: string,
  sourceColor: string,
  count = 8
): Promise<NewsItem[]> {
  try {
    const rss2jsonUrl =
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=${count}`;

    const res = await withTimeout(fetch(rss2jsonUrl), 5000);
    const data = await res.json() as any;

    if (data.status !== "ok" || !data.items?.length) return [];

    return data.items.slice(0, count).map((item: any) => ({
      id: item.guid || item.link,
      title: item.title,
      url: item.link,
      source,
      sourceColor,
      publishedAt: item.pubDate,
      timeAgo: timeAgo(item.pubDate),
      description: item.description
        ?.replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 140),
    }));
  } catch (e) {
    console.error(`[News] ${source} feed failed:`, e);
    return [];
  }
}

export const fetchTechCrunch = () =>
  fetchRSSviaCORS(
    "https://techcrunch.com/feed/",
    "TechCrunch", "#0A9E00"
  );

// Crunchbase removed public RSS — replaced with Sifted (MENA/global startup news)
export const fetchSifted = () =>
  fetchRSSviaCORS(
    "https://sifted.eu/feed/",
    "Sifted", "#0288D1"
  );

export const fetchVentureBeat = () =>
  fetchRSSviaCORS(
    "https://venturebeat.com/feed/",
    "VentureBeat", "#7B1FA2"
  );

export const fetchWired = () =>
  fetchRSSviaCORS(
    "https://www.wired.com/feed/category/business/startups/latest/rss",
    "WIRED", "#E91E63"
  );

export async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled([
    fetchHackerNews(),
    fetchTechCrunch(),
    fetchSifted(),
    fetchVentureBeat(),
    fetchWired(),
  ]);

  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  const seen = new Set<string>();
  const unique = all.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  return unique.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
