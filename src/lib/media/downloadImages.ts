import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getCategoryFallbackUrls } from "./categoryFallbacks";

const MIN_IMAGE_BYTES = 8000;

function guessExtension(url: string, contentType?: string): string {
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("gif")) return ".gif";
  const match = url.match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  if (match) return `.${match[1].toLowerCase().replace("jpeg", "jpg")}`;
  return ".jpg";
}

async function downloadOne(url: string, destPath: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "NewsAutoTikTok/1.0 Image Downloader" },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return false;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < MIN_IMAGE_BYTES) return false;

    await writeFile(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

export interface DownloadImagesResult {
  localPaths: string[];
  publicPaths: string[];
  downloaded: number;
  attempted: number;
}

export async function downloadImages(
  articleId: string,
  urls: string[],
  category = "general"
): Promise<DownloadImagesResult> {
  const dir = path.join(process.cwd(), "public", "generated", "images", articleId);
  await mkdir(dir, { recursive: true });

  const allUrls = [...urls];
  if (allUrls.length < 3) {
    allUrls.push(...getCategoryFallbackUrls(category));
  }

  const uniqueUrls = [...new Set(allUrls)];
  const localPaths: string[] = [];
  let attempted = 0;

  for (let i = 0; i < uniqueUrls.length && localPaths.length < 6; i++) {
    attempted++;
    const url = uniqueUrls[i];
    const destPath = path.join(dir, `img-${localPaths.length}${guessExtension(url)}`);

    const ok = await downloadOne(url, destPath);
    if (ok) {
      localPaths.push(destPath);
      console.log(`[downloadImages] articleId=${articleId} saved ${destPath}`);
    }
  }

  const publicPaths = localPaths.map((p) => {
    const rel = path.relative(path.join(process.cwd(), "public"), p);
    return `/${rel.replace(/\\/g, "/")}`;
  });

  console.log(
    `[downloadImages] articleId=${articleId} downloaded ${localPaths.length}/${attempted} image(s)`
  );

  return { localPaths, publicPaths, downloaded: localPaths.length, attempted };
}

export async function ensureMinimumImages(
  articleId: string,
  localPaths: string[],
  title: string,
  category: string
): Promise<string[]> {
  if (localPaths.length >= 1) return localPaths;

  const dir = path.join(process.cwd(), "public", "generated", "images", articleId);
  await mkdir(dir, { recursive: true });

  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);

  const colors = ["0x1a1a2e", "0x16213e", "0x0f3460"];
  const generated: string[] = [];

  for (let i = 0; i < 3; i++) {
    const outPath = path.join(dir, `fallback-${i}.jpg`);
    try {
      await execFileAsync(
        "ffmpeg",
        [
          "-y",
          "-f", "lavfi",
          "-i", `color=c=${colors[i]}:s=1080x1920:d=1`,
          "-frames:v", "1",
          outPath,
        ],
        { timeout: 20000 }
      );
      generated.push(outPath);
    } catch {
      // ignore
    }
  }

  if (generated.length === 0 && localPaths.length === 0) {
    throw new Error("Could not download or generate fallback images");
  }

  console.log(`[downloadImages] articleId=${articleId} generated ${generated.length} fallback slide(s)`);
  return [...localPaths, ...generated];
}
