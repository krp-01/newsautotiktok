import Parser from "rss-parser";
import { prisma } from "../prisma";
import type { Source } from "@/generated/prisma/client";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "NewsAutoTikTok/1.0 RSS Fetcher" },
});

export interface FetchResult {
  sourceId: string;
  sourceName: string;
  fetched: number;
  skipped: number;
  errors: string[];
}

export async function fetchNewsFromSource(source: Source): Promise<FetchResult> {
  const result: FetchResult = {
    sourceId: source.id,
    sourceName: source.name,
    fetched: 0,
    skipped: 0,
    errors: [],
  };

  if (!source.active) {
    result.errors.push("Source is inactive");
    return result;
  }

  try {
    const feed = await parser.parseURL(source.rssUrl);

    for (const item of feed.items) {
      if (!item.link || !item.title) continue;

      const existing = await prisma.article.findUnique({ where: { url: item.link } });
      if (existing) {
        result.skipped++;
        continue;
      }

      const description =
        item.contentSnippet ||
        item.summary ||
        null;

      const content =
        item.content?.replace(/<[^>]*>/g, "").trim() ||
        description ||
        "";

      const imageUrl =
        (item.enclosure?.url && item.enclosure.type?.startsWith("image")
          ? item.enclosure.url
          : null) ||
        extractImageFromContent(item.content || "") ||
        null;

      await prisma.article.create({
        data: {
          title: item.title,
          url: item.link,
          description: description?.slice(0, 1000) || null,
          content: content.slice(0, 5000),
          imageUrl,
          category: source.category,
          sourceId: source.id,
          status: "NEW",
        },
      });

      result.fetched++;
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Unknown fetch error");
  }

  return result;
}

function extractImageFromContent(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}

export async function fetchAllActiveSources(): Promise<FetchResult[]> {
  const sources = await prisma.source.findMany({ where: { active: true } });
  const results: FetchResult[] = [];

  for (const source of sources) {
    results.push(await fetchNewsFromSource(source));
  }

  return results;
}
