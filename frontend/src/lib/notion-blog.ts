import { createServerFn } from "@tanstack/react-start";
import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

const DB_ID = "8a99a69aa1a2422d81fe4b9149a68024";

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

function getNotionClient(): Client {
  const cfEnv = (globalThis as any).__cf_env || {};
  const key =
    cfEnv.NOTION_API_KEY ||
    (typeof process !== "undefined" ? process.env?.NOTION_API_KEY : "") ||
    "";
  if (!key) throw new Error("NOTION_API_KEY not set in Cloudflare secrets");
  return new Client({ auth: key });
}

// Brand is "Hockystick" (no e). Notion-authored content has shipped with the
// misspelling before — normalize every rendered string so it can't reach the
// page or meta tags. Slugs are exempt: changing them would break live URLs.
function fixBrand(text: string): string {
  return text.replace(/Hockeystick/g, "Hockystick").replace(/hockeystick/g, "hockystick");
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
                 props.Author?.people?.[0]?.name ?? "The Hockystick Team";
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

export const getPublishedPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<BlogPost[]> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const key = cfEnv.NOTION_API_KEY || "";
    if (!key) {
      console.error("[Notion] NOTION_API_KEY not found in __cf_env");
      return [];
    }

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
        return [];
      }

      const posts = (data.results as PageObjectResponse[])
        .filter((p) => p.object === "page")
        .map(extractPostMeta);

      console.log("[Notion] Posts fetched:", posts.length);
      posts.forEach((p) => console.log("[Notion] Post:", p.slug, "|", p.title));

      // Sort by publishDate descending (newest first)
      posts.sort((a, b) => b.publishDate.localeCompare(a.publishDate));
      return posts;
    } catch (err) {
      console.error("[Notion] getPublishedPosts error:", err);
      return [];
    }
  }
);

export const getPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => d as { slug: string })
  .handler(async ({ data }): Promise<BlogPostWithContent | null> => {
    try {
      const cfEnv = (globalThis as any).__cf_env || {};
      const key = cfEnv.NOTION_API_KEY || "";
      if (!key) { console.error("[Notion] NOTION_API_KEY missing in getPostBySlug"); return null; }

      console.log("[Notion] getPostBySlug called with:", data.slug);

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
              { property: "Slug", rich_text: { equals: data.slug } },
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

      return { ...meta, contentHtml: blocksToHtml(allBlocks) };
    } catch (err) {
      console.error("[notion-blog] getPostBySlug error:", err);
      return null;
    }
  });
