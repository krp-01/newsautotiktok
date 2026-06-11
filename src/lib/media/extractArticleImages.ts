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
  /banner/i,
  /advert/i,
  /ads/i,
  /promo/i,
  /placeholder/i,
  /default/i,
  /thumb_small/i,
];

const MIN_URL_LENGTH = 20;

function normalizeUrl(url: string, baseUrl: string): string | null {
  try {
    if (!url || url.startsWith("data:")) return null;
    const resolved = new URL(url, baseUrl);
    if (!["http:", "https:"].includes(resolved.protocol)) return null;
    resolved.hash = "";
    return resolved.href;
  } catch {
    return null;
  }
}

function imageDedupeKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/-\d+x\d+(?=\.\w+$)/, "");
  } catch {
    return url.toLowerCase();
  }
}

function isRelevantImageUrl(url: string): boolean {
  if (url.length < MIN_URL_LENGTH) return false;
  if (SKIP_PATTERNS.some((p) => p.test(url))) return false;
  const lower = url.toLowerCase();
  if (lower.endsWith(".svg")) return false;
  if (lower.includes("width=1") || lower.includes("height=1")) return false;
  if (lower.includes("w=16") || lower.includes("h=16")) return false;
  return true;
}

function extractFromHtml(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];

  $(
    'meta[property="og:image"], meta[name="og:image"], meta[property="twitter:image"], meta[name="twitter:image"]'
  ).each((_, el) => {
    const content = $(el).attr("content");
    if (content) urls.push(content);
  });

  $("img").each((_, el) => {
    const src =
      $(el).attr("src") ||
      $(el).attr("data-src") ||
      $(el).attr("data-lazy-src") ||
      $(el).attr("data-original");
    if (src) urls.push(src);

    const srcset = $(el).attr("srcset");
    if (srcset) {
      const candidates = srcset
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean);
      if (candidates.length) urls.push(candidates[candidates.length - 1]);
    }
  });

  $("figure img, article img, .article img, .content img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src) urls.unshift(src);
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
  const ordered: string[] = [];
  const seen = new Set<string>();

  function add(url: string | null | undefined) {
    if (!url) return;
    const normalized = normalizeUrl(url, article.url);
    if (!normalized || !isRelevantImageUrl(normalized)) return;
    const key = imageDedupeKey(normalized);
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(normalized);
  }

  add(article.imageUrl);

  if (article.content) {
    for (const url of extractFromHtml(article.content, article.url)) add(url);
  }

  const pageHtml = await fetchArticleHtml(article.url);
  if (pageHtml) {
    for (const url of extractFromHtml(pageHtml, article.url)) add(url);
  }

  console.log(`[extractArticleImages] articleId=${article.id} found ${ordered.length} image URL(s)`);
  return ordered;
}

export function selectImageCount(available: number): number {
  if (available <= 0) return 0;
  if (available <= 3) return available;
  if (available <= 8) return available;
  return Math.min(12, Math.max(8, available));
}
