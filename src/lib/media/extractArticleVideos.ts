import * as cheerio from "cheerio";
import type { Article, Source } from "@/generated/prisma/client";
import {
  dedupeVideoUrls,
  isAuthorizedVideoUrl,
  parseAllowedVideoDomains,
  type ExtractedVideo,
} from "./videoAuthorization";

export type { ExtractedVideo };

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

function extractFromHtml(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];

  $(
    'meta[property="og:video"], meta[property="og:video:url"], meta[name="og:video"], meta[property="twitter:player:stream"], meta[name="twitter:player:stream"]'
  ).each((_, el) => {
    const content = $(el).attr("content");
    if (content) urls.push(content);
  });

  $("video").each((_, el) => {
    const src = $(el).attr("src");
    if (src) urls.push(src);
    $(el)
      .find("source")
      .each((__, source) => {
        const sourceSrc = $(source).attr("src");
        if (sourceSrc) urls.push(sourceSrc);
      });
  });

  $("iframe[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) urls.push(src);
  });

  return urls.map((u) => normalizeUrl(u, baseUrl)).filter((u): u is string => !!u);
}

async function fetchArticleHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "NewsAutoTikTok/1.0 Media Extractor",
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

export async function extractArticleVideos(
  article: Article,
  source: Pick<
    Source,
    "baseUrl" | "allowVideoExtraction" | "allowedVideoDomains" | "useSourceVideos"
  >
): Promise<ExtractedVideo[]> {
  if (!source.useSourceVideos || !source.allowVideoExtraction) {
    console.log(
      `[extractArticleVideos] articleId=${article.id} source video extraction disabled on source`
    );
    return [];
  }

  const allowedDomains = parseAllowedVideoDomains(source.allowedVideoDomains, source.baseUrl);
  const candidates: string[] = [];

  if (article.content) {
    candidates.push(...extractFromHtml(article.content, article.url));
  }

  const pageHtml = await fetchArticleHtml(article.url);
  if (pageHtml) {
    candidates.push(...extractFromHtml(pageHtml, article.url));
  }

  const unique = dedupeVideoUrls(candidates);
  const authorized: ExtractedVideo[] = [];

  for (const url of unique) {
    if (isAuthorizedVideoUrl(url, allowedDomains)) {
      authorized.push({
        url,
        kind: "direct",
        domain: new URL(url).hostname,
      });
    }
  }

  if (!authorized.length) {
    console.log(
      `[extractArticleVideos] articleId=${article.id} source video unavailable or not authorized ` +
        `(candidates=${unique.length}, allowedDomains=${allowedDomains.join(",") || "none"})`
    );
  } else {
    console.log(
      `[extractArticleVideos] articleId=${article.id} found ${authorized.length} authorized video URL(s)`
    );
  }

  return authorized.slice(0, 3);
}
