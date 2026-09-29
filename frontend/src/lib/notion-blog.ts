import { createServerFn } from "@tanstack/react-start";
import type {
  PageObjectResponse,
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

const DB_ID = "8a99a69aa1a2422d81fe4b9149a68024";

// SEO-017 Phase 1 — Cache API layer, no new wrangler bindings. caches.default
// is a Workers-global, not a bound resource, so this needs no wrangler.toml
// change. Keyed by a synthetic same-origin URL (Cache API only keys on
// Request/URL, not arbitrary strings) under a path no real route serves,
// so there's no risk of colliding with an actual page response.
//
// Real stale-while-revalidate, not just a plain TTL: the freshness check is
// done ourselves against a `fetchedAt` timestamp embedded in the cached
// payload, not left to the Cache API's own Cache-Control expiry (that HTTP
// header is deliberately set much longer than CACHE_TTL_SECONDS — see
// SWR_GRACE_SECONDS below — specifically so a "stale" entry is still
// PRESENT in the cache and can be served instantly while a background
// refresh runs, instead of having already been evicted by the time we'd
// want to read it). Three outcomes: FRESH (age < TTL) → serve, no refetch.
// STALE (TTL <= age < TTL + grace) → serve the stale value immediately,
// hand a refetch to ctx.waitUntil so the NEXT request gets new data, but
// this request is never slowed down by it. ABSENT (age >= grace, or never
// cached) → must fetch synchronously, nothing to serve in the meantime.
// Never cache an error or an empty result — a transient Notion failure
// must not get pinned into the cache and served as truth for 10+ minutes.
const CACHE_TTL_SECONDS = 600;
const SWR_GRACE_SECONDS = 600; // serve stale for up to another 10 min while revalidating
const CACHE_ORIGIN = "https://lengdon-notion-cache.internal";

interface CacheEnvelope<T> {
  fetchedAt: number; // ms epoch
  value: T;
}

function cacheKeyFor(path: string): Request {
  return new Request(`${CACHE_ORIGIN}${path}`);
}

type CacheReadResult<T> = { state: "fresh" | "stale"; value: T } | null;

async function readCache<T>(path: string): Promise<CacheReadResult<T>> {
  try {
    const cache = (caches as any).default;
    if (!cache) return null;
    const hit = await cache.match(cacheKeyFor(path));
    if (!hit) return null;
    const envelope = (await hit.json()) as CacheEnvelope<T>;
    const ageSeconds = (Date.now() - envelope.fetchedAt) / 1000;
    if (ageSeconds < CACHE_TTL_SECONDS) return { state: "fresh", value: envelope.value };
    if (ageSeconds < CACHE_TTL_SECONDS + SWR_GRACE_SECONDS) return { state: "stale", value: envelope.value };
    return null; // past the grace window — treat as absent, force a real fetch
  } catch {
    return null;
  }
}

async function writeCache(path: string, value: unknown): Promise<void> {
  try {
    const cache = (caches as any).default;
    if (!cache) return;
    const envelope: CacheEnvelope<unknown> = { fetchedAt: Date.now(), value };
    const res = new Response(JSON.stringify(envelope), {
      headers: {
        "content-type": "application/json",
        // HTTP-level max-age intentionally covers TTL + grace, not just
        // TTL — the entry must still be physically present in the cache
        // for the "stale" branch above to have anything to read.
        "cache-control": `max-age=${CACHE_TTL_SECONDS + SWR_GRACE_SECONDS}`,
      },
    });
    await cache.put(cacheKeyFor(path), res);
  } catch {
    // Cache write failure is never fatal — the caller already has the
    // real data from Notion; this only affects the next request's speed.
  }
}

function waitUntil(promise: Promise<unknown>): void {
  const ctx = (globalThis as any).__cf_ctx;
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(promise);
  } else {
    // No ExecutionContext available (e.g. local dev) — still run it, just
    // not held open past the response; better than silently dropping the
    // refresh entirely. Swallow rejection here so an unhandled-rejection
    // warning doesn't fire for a background task nobody awaited.
    promise.catch(() => {});
  }
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  readingTime: string;
  publishDate: string;
  coverImage: string | null;
  seoTitle: string;
  seoDescription: string;
  author: string;
}

export interface BlogPostWithContent extends BlogPost {
  contentHtml: string;
}

// All Notion calls in this file use raw fetch against api.notion.com — the
// @notionhq/client SDK was 88KB of dead weight in the CF worker bundle and
// only its types are used now.

// Brand is "Lengdon" (no e). Notion-authored content has shipped with the
// misspelling before — normalize every rendered string so it can't reach the
// page or meta tags. Slugs are exempt: changing them would break live URLs.
function fixBrand(text: string): string {
  return text.replace(/Hockeystick/g, "Lengdon").replace(/hockeystick/g, "lengdon");
}

function richTextToString(richText: RichTextItemResponse[]): string {
  return fixBrand(richText.map((t) => t.plain_text).join(""));
}

function extractPostMeta(page: PageObjectResponse): BlogPost {
  const props = page.properties as any;

  const rawJoin = (rt: any[]) => rt.map((t: any) => t.plain_text).join("");
  const rawTitle = props.Title?.title ? rawJoin(props.Title.title) :
                   props.Name?.title  ? rawJoin(props.Name.title)  : "Untitled";
  const title = fixBrand(rawTitle);

  // Slug bypasses fixBrand — normalizing it would break already-indexed URLs
  const slug = props.Slug?.rich_text ? rawJoin(props.Slug.rich_text) :
               rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const excerpt = props.Excerpt?.rich_text ? richTextToString(props.Excerpt.rich_text) : "";
  const seoTitle = props["SEO Title"]?.rich_text ? richTextToString(props["SEO Title"].rich_text) : title;
  const seoDescription = props["SEO Description"]?.rich_text ? richTextToString(props["SEO Description"].rich_text) : excerpt;
  const author = props.Author?.rich_text ? richTextToString(props.Author.rich_text) :
                 props.Author?.people?.[0]?.name ?? "The Lengdon Team";
  const readingTimeRaw = props["Reading Time"]?.number;
  const readingTime = readingTimeRaw != null ? `${readingTimeRaw} min read` : "5 min read";

  const tags: string[] = props.Tags?.multi_select?.map((t: any) => t.name) ?? [];

  const publishDate =
    props["Publish Date"]?.date?.start ??
    props.Date?.date?.start ??
    new Date(page.created_time).toISOString().slice(0, 10);

  const coverImage: string | null =
    props["Cover Image URL"]?.url ||
    (page as any).cover?.external?.url ||
    (page as any).cover?.file?.url ||
    null;

  return { id: page.id, slug, title, excerpt, tags, readingTime, publishDate, coverImage, seoTitle, seoDescription, author };
}

// ── Block → HTML ──────────────────────────────────────────────────────────────

function richTextToHtml(richText: RichTextItemResponse[]): string {
  return richText.map((t) => {
    let text = fixBrand(t.plain_text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (t.annotations.bold)          text = `<strong>${text}</strong>`;
    if (t.annotations.italic)        text = `<em>${text}</em>`;
    if (t.annotations.strikethrough) text = `<s>${text}</s>`;
    if (t.annotations.underline)     text = `<u>${text}</u>`;
    if (t.annotations.code)          text = `<code>${text}</code>`;
    if ("href" in t && t.href)       text = `<a href="${t.href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    return text;
  }).join("");
}

function blocksToHtml(blocks: BlockObjectResponse[]): string {
  const parts: string[] = [];
  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listBuffer.length && listType) {
      parts.push(`<${listType}>${listBuffer.join("")}</${listType}>`);
      listBuffer = [];
      listType = null;
    }
  };

  for (const block of blocks) {
    const b = block as any;
    const type: string = block.type;

    if (type !== "bulleted_list_item" && type !== "numbered_list_item") flushList();

    switch (type) {
      case "paragraph":
        parts.push(`<p>${richTextToHtml(b.paragraph.rich_text)}</p>`);
        break;
      case "heading_1":
        parts.push(`<h1>${richTextToHtml(b.heading_1.rich_text)}</h1>`);
        break;
      case "heading_2":
        parts.push(`<h2>${richTextToHtml(b.heading_2.rich_text)}</h2>`);
        break;
      case "heading_3":
        parts.push(`<h3>${richTextToHtml(b.heading_3.rich_text)}</h3>`);
        break;
      case "bulleted_list_item":
        if (listType !== "ul") { flushList(); listType = "ul"; }
        listBuffer.push(`<li>${richTextToHtml(b.bulleted_list_item.rich_text)}</li>`);
        break;
      case "numbered_list_item":
        if (listType !== "ol") { flushList(); listType = "ol"; }
        listBuffer.push(`<li>${richTextToHtml(b.numbered_list_item.rich_text)}</li>`);
        break;
      case "quote":
        parts.push(`<blockquote>${richTextToHtml(b.quote.rich_text)}</blockquote>`);
        break;
      case "code":
        parts.push(`<pre><code class="language-${b.code.language}">${richTextToHtml(b.code.rich_text)}</code></pre>`);
        break;
      case "divider":
        parts.push("<hr />");
        break;
      case "image": {
        const url = b.image?.file?.url ?? b.image?.external?.url ?? "";
        const caption = b.image?.caption?.length ? richTextToHtml(b.image.caption) : "";
        parts.push(`<figure><img src="${url}" alt="${caption}" loading="lazy" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`);
        break;
      }
      case "callout": {
        const emoji = b.callout?.icon?.emoji ?? "💡";
        parts.push(`<div class="callout"><span>${emoji}</span><div>${richTextToHtml(b.callout.rich_text)}</div></div>`);
        break;
      }
      case "toggle":
        parts.push(`<details><summary>${richTextToHtml(b.toggle.rich_text)}</summary></details>`);
        break;
      default:
        break;
    }
  }

  flushList();
  return parts.join("\n");
}

// ── Server functions ──────────────────────────────────────────────────────────

const PUBLISHED_POSTS_CACHE_PATH = "/__cache/published-posts";

async function fetchPublishedPostsFromNotion(key: string): Promise<BlogPost[] | null> {
  try {
    // No sort — "Publish Date" property name may differ per DB.
    // We sort client-side by publishDate after fetching.
    const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_size: 50,
        filter: { property: "Status", select: { equals: "Published" } },
      }),
    });

    const data = await res.json() as any;

    if (!res.ok) {
      console.error("[Notion] Query failed:", data.message);
      return null;
    }

    const posts = (data.results as PageObjectResponse[])
      .filter((p) => p.object === "page")
      .map(extractPostMeta);

    console.log("[Notion] Posts fetched:", posts.length);
    posts.forEach((p) => console.log("[Notion] Post:", p.slug, "|", p.title));

    // Sort by publishDate descending (newest first)
    posts.sort((a, b) => b.publishDate.localeCompare(a.publishDate));

    // Never cache an empty result — a 0-post response almost always means
    // something upstream went wrong (wrong filter, transient Notion issue),
    // and pinning "no posts" into the cache for 10 minutes would make the
    // blog index and this page's related-post lookup both go dark for
    // everyone until it expires.
    if (posts.length > 0) {
      await writeCache(PUBLISHED_POSTS_CACHE_PATH, posts);
    }
    return posts;
  } catch (err) {
    console.error("[Notion] getPublishedPosts error:", err);
    return null;
  }
}

export const getPublishedPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<BlogPost[]> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const key = cfEnv.NOTION_API_KEY || "";
    if (!key) {
      console.error("[Notion] NOTION_API_KEY not found in __cf_env");
      return [];
    }

    const cached = await readCache<BlogPost[]>(PUBLISHED_POSTS_CACHE_PATH);
    if (cached?.state === "fresh") {
      return cached.value;
    }
    if (cached?.state === "stale") {
      // Serve the stale list now; refresh in the background so the NEXT
      // request gets new data. This request is never slowed down by it.
      waitUntil(fetchPublishedPostsFromNotion(key));
      return cached.value;
    }

    const fresh = await fetchPublishedPostsFromNotion(key);
    return fresh ?? [];
  }
);

function postCachePath(slug: string): string {
  // encodeURIComponent, not the raw slug — this becomes a URL path
  // component for the synthetic cache-key Request, and a slug could in
  // principle contain characters that break that (it comes from user
  // input via the route param, not just from Notion).
  return `/__cache/post/${encodeURIComponent(slug)}`;
}

async function fetchPostBySlugFromNotion(key: string, slug: string): Promise<BlogPostWithContent | null> {
  try {
    console.log("[Notion] getPostBySlug called with:", slug);

    const headers = {
      Authorization: `Bearer ${key}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    };

    // Query DB by slug using raw fetch (avoids SDK sort/filter issues)
    const queryRes = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        page_size: 1,
        filter: {
          and: [
            { property: "Status", select: { equals: "Published" } },
            { property: "Slug", rich_text: { equals: slug } },
          ],
        },
      }),
    });
    const queryData = await queryRes.json() as any;
    console.log("[Notion] slug query status:", queryRes.status, "results:", queryData.results?.length ?? 0, "error:", queryData.message ?? "none");

    const page = (queryData.results as PageObjectResponse[] | undefined)?.find((p) => p.object === "page");
    if (!page) return null;

    const meta = extractPostMeta(page);

    // Fetch all blocks (paginate if needed) via raw fetch
    const allBlocks: BlockObjectResponse[] = [];
    let cursor: string | undefined;
    do {
      const url = `https://api.notion.com/v1/blocks/${page.id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`;
      const blocksRes = await fetch(url, { headers });
      const blocksData = await blocksRes.json() as any;
      allBlocks.push(...(blocksData.results ?? []));
      cursor = blocksData.has_more ? blocksData.next_cursor ?? undefined : undefined;
    } while (cursor);

    const post: BlogPostWithContent = { ...meta, contentHtml: blocksToHtml(allBlocks) };
    // Never cache a miss — a post that legitimately doesn't exist yet
    // (draft, not-yet-published, real typo in the URL) is a different
    // thing from "Notion was momentarily unreachable," but this function
    // can't tell them apart, so treat every null the same way: don't let
    // it become a cached "this post doesn't exist" verdict for 10+
    // minutes right after the post goes live.
    await writeCache(postCachePath(slug), post);
    return post;
  } catch (err) {
    console.error("[notion-blog] getPostBySlug error:", err);
    return null;
  }
}

// TEMPORARY, SEO-017 Phase 1 verification only — proves the fresh/stale/
// miss branches actually fire on the deployed worker, independent of
// Cloudflare's anycast colo-bouncing making wall-clock TTFB alone
// unreliable to interpret from outside the network. Removed before the
// final PR commit; not shipped. Logs via console.error (visible in
// `wrangler pages deployment tail` / the CF dashboard's real-time logs)
// rather than only a response header, since a header set mid-handler
// during streaming SSR may not land if headers were already flushed —
// a server-side log is unambiguous regardless of that timing question.
async function logDiagnosticCacheState(fn: string, slug: string, state: "fresh" | "stale" | "miss"): Promise<void> {
  console.error(`[SEO-017-DIAG] ${fn} slug=${slug} state=${state}`);
}

export const getPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => d as { slug: string })
  .handler(async ({ data }): Promise<BlogPostWithContent | null> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const key = cfEnv.NOTION_API_KEY || "";
    if (!key) { console.error("[Notion] NOTION_API_KEY missing in getPostBySlug"); return null; }

    const cached = await readCache<BlogPostWithContent>(postCachePath(data.slug));
    if (cached?.state === "fresh") {
      await logDiagnosticCacheState("getPostBySlug", data.slug, "fresh");
      return cached.value;
    }
    if (cached?.state === "stale") {
      await logDiagnosticCacheState("getPostBySlug", data.slug, "stale");
      waitUntil(fetchPostBySlugFromNotion(key, data.slug));
      return cached.value;
    }

    await logDiagnosticCacheState("getPostBySlug", data.slug, "miss");
    return fetchPostBySlugFromNotion(key, data.slug);
  });
