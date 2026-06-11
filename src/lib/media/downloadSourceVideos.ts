import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { ExtractedVideo } from "./extractArticleVideos";

const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const CLIP_SECONDS = 12;

export interface DownloadedSourceVideo {
  localPath: string;
  publicPath: string;
  clipSeconds: number;
}

async function downloadDirectVideo(url: string, destPath: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "NewsAutoTikTok/1.0 Video Downloader" },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return false;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("video") && !url.match(/\.(mp4|webm|mov)/i)) {
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 50000 || buffer.length > MAX_VIDEO_BYTES) return false;

    await writeFile(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

export async function downloadSourceVideos(
  articleId: string,
  videos: ExtractedVideo[]
): Promise<DownloadedSourceVideo[]> {
  if (!videos.length) return [];

  const dir = path.join(process.cwd(), "public", "generated", "source-videos", articleId);
  await mkdir(dir, { recursive: true });

  const downloaded: DownloadedSourceVideo[] = [];

  for (let i = 0; i < videos.length && downloaded.length < 2; i++) {
    const url = videos[i].url;
    const ext = url.match(/\.(mp4|webm|mov)/i)?.[1]?.toLowerCase() || "mp4";
    const destPath = path.join(dir, `clip-${downloaded.length}.${ext}`);

    const ok = await downloadDirectVideo(url, destPath);
    if (!ok) {
      console.log(
        `[downloadSourceVideos] articleId=${articleId} skipped unauthorized/inaccessible: ${url}`
      );
      continue;
    }

    const publicPath = `/generated/source-videos/${articleId}/clip-${downloaded.length}.${ext}`;
    downloaded.push({ localPath: destPath, publicPath, clipSeconds: CLIP_SECONDS });
    console.log(`[downloadSourceVideos] articleId=${articleId} saved ${destPath}`);
  }

  return downloaded;
}
