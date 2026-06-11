import * as cheerio from "cheerio";
import type { Article } from "@/generated/prisma/client";

const SKIP_PATTERNS = [
  /favicon/i,
  /logo/i,
  /icon/i,
  /sprite/i,
  /avatar/i,
  /emoji/i,
  /badge/i,
  /button/i,
  /pixel/i,
  /tracking/i,
  /1x1/i,
  /spacer/i,
];

const MIN_URL_LENGTH = 20;

function normalizeUrl(url: string, baseUrl: string): string | null {
  try {
    if (!url || url.startsWith("data:")) return null;
    const resolved = new URL(url, baseUrl);
    if (!["http:", "https:"].includes(resolved.protocol)) return null;
    return resolved.href.split("#")[0];
  } catch {
    return null;
  }
}

function isRelevantImageUrl(url: string): boolean {
  if (url.length < MIN_URL_LENGTH) return false;
  if (SKIP_PATTERNS.some((p) => p.test(url))) return false;
  const lower = url.toLowerCase();
  if (lower.endsWith(".svg")) return false;
  if (lower.includes("width=1") || lower.includes("height=1")) return false;
  return true;
}

function extractFromHtml(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];

  $('meta[property="og:image"], meta[name="og:image"], meta[property="twitter:image"], meta[name="twitter:image"]').each(
    (_, el) => {
      const content = $(el).attr("content");
      if (content) urls.push(content);
    }
  );

  $("img").each((_, el) => {
    const src =
      $(el).attr("src") ||
      $(el).attr("data-src") ||
      $(el).attr("data-lazy-src") ||
      $(el).attr("data-original");
    if (src) urls.push(src);

    const srcset = $(el).attr("srcset");
    if (srcset) {
      const first = srcset.split(",")[0]?.trim().split(/\s+/)[0];
      if (first) urls.push(first);
    }
  });

  return urls
    .map((u) => normalizeUrl(u, baseUrl))
    .filter((u): u is string => !!u && isRelevantImageUrl(u));
}

async function fetchArticleHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "NewsAutoTikTok/1.0 Image Extractor",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function extractArticleImages(article: Article): Promise<string[]> {
  const found = new Set<string>();

  if (article.imageUrl) {
    const normalized = normalizeUrl(article.imageUrl, article.url);
    if (normalized) found.add(normalized);
  }

  if (article.content) {
    for (const url of extractFromHtml(article.content, article.url)) {
      found.add(url);
    }
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = imgRegex.exec(article.content)) !== null) {
      const normalized = normalizeUrl(match[1], article.url);
      if (normalized && isRelevantImageUrl(normalized)) found.add(normalized);
    }
  }

  const pageHtml = await fetchArticleHtml(article.url);
  if (pageHtml) {
    for (const url of extractFromHtml(pageHtml, article.url)) {
      found.add(url);
    }
  }

  const unique = [...found];
  console.log(`[extractArticleImages] articleId=${article.id} found ${unique.length} image URL(s)`);
  return unique.slice(0, 12);
}
