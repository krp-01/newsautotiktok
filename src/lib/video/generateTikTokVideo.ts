import { execFile } from "child_process";
import { mkdir, writeFile, unlink, access } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { promisify } from "util";
import type { Article, GeneratedScript, AppSettings } from "@/generated/prisma/client";
import type { SubtitleSegment } from "../ai/generateScript";
import { extractArticleImages } from "../media/extractArticleImages";
import { downloadImages, ensureMinimumImages } from "../media/downloadImages";
import { getAudioDurationSeconds, estimateSpeechDuration } from "../media/ffprobe";
import {
  parseSubtitles,
  syncSubtitlesToDuration,
  buildSubtitlesFromText,
  getVoiceoverText,
} from "../media/subtitles";

const execFileAsync = promisify(execFile);
const FPS = 30;

export interface VideoGenerationInput {
  article: Article;
  script: GeneratedScript;
  settings: AppSettings;
  audioPath?: string | null;
  preloadedImages?: string[];
}

export interface VideoGenerationResult {
  videoPath: string;
  duration: number;
  voiceoverSkipped: boolean;
  imageCount: number;
  downloadedImages: string[];
  audioPath: string | null;
}

function sanitizeText(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeDrawtext(text: string): string {
  return sanitizeText(text)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function escapeFilterPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:");
}

function getFontFile(): string | null {
  const candidates = [
    path.join(process.env.WINDIR || "C:\\Windows", "Fonts", "arial.ttf"),
    path.join(process.env.WINDIR || "C:\\Windows", "Fonts", "segoeui.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function drawtextOpts(extra: string): string {
  const font = getFontFile();
  if (font) return `fontfile='${escapeFilterPath(font)}':${extra}`;
  return extra;
}

function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function buildAssFile(subtitles: SubtitleSegment[], assPath: string): string {
  const lines = subtitles.map(
    (sub) =>
      `Dialogue: 0,${formatAssTime(sub.start)},${formatAssTime(sub.end)},Default,,0,0,0,,${sanitizeText(sub.text)}`
  );

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,44,&H00FFFFFF,&H000000FF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,3,1,2,50,50,200,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${lines.join("\n")}
`;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createImageSegment(
  imagePath: string,
  outputPath: string,
  duration: number,
  index: number
): Promise<void> {
  const frames = Math.ceil(duration * FPS);
  const zoomDir = index % 2 === 0 ? "in" : "out";
  const zoomExpr =
    zoomDir === "in"
      ? `min(zoom+0.0008,1.18)`
      : `if(lte(zoom,1.0),1.18,max(1.0,zoom-0.0008))`;

  const vf = [
    "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
    `zoompan=z='${zoomExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS}`,
    "fade=t=in:st=0:d=0.4",
    `fade=t=out:st=${Math.max(0, duration - 0.5)}:d=0.5`,
  ].join(",");

  await execFileAsync(
    "ffmpeg",
    ["-y", "-loop", "1", "-i", imagePath, "-t", String(duration), "-vf", vf, "-pix_fmt", "yuv420p", "-an", outputPath],
    { timeout: 90000, maxBuffer: 10 * 1024 * 1024 }
  );
}

async function concatSegments(segmentPaths: string[], outputPath: string): Promise<void> {
  const listPath = outputPath.replace(".mp4", "-list.txt");
  const listContent = segmentPaths.map((p) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n");
  await writeFile(listPath, listContent, "utf-8");

  await execFileAsync(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outputPath],
    { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
  );

  await unlink(listPath).catch(() => {});
}

async function applyOverlaysAndAudio(
  inputVideo: string,
  outputPath: string,
  options: {
    title: string;
    watermark: string;
    assPath: string | null;
    audioPath: string | null;
    duration: number;
  }
): Promise<void> {
  const filters: string[] = [];
  const titleText = escapeDrawtext(options.title);

  filters.push(
    `drawtext=${drawtextOpts(
      `text='${titleText}':fontsize=50:fontcolor=white:borderw=3:bordercolor=black@0.8:box=1:boxcolor=black@0.4:boxborderw=8:x=(w-text_w)/2:y=70`
    )}`
  );

  if (options.watermark) {
    filters.push(
      `drawtext=${drawtextOpts(
        `text='${escapeDrawtext(options.watermark)}':fontsize=26:fontcolor=white@0.75:x=w-text_w-24:y=24`
      )}`
    );
  }

  if (options.assPath && (await fileExists(options.assPath))) {
    filters.push(`ass='${escapeFilterPath(options.assPath)}'`);
  }

  const args = ["-y", "-i", inputVideo];

  let audioIdx = -1;
  if (options.audioPath && (await fileExists(options.audioPath))) {
    args.push("-i", options.audioPath);
    audioIdx = 1;
  }

  args.push("-vf", filters.join(","), "-c:v", "libx264", "-pix_fmt", "yuv420p");

  if (audioIdx >= 0) {
    args.push("-c:a", "aac", "-b:a", "192k", "-map", "0:v", "-map", `${audioIdx}:a`, "-shortest");
  } else {
    args.push("-an");
  }

  args.push("-t", String(options.duration), outputPath);

  await execFileAsync("ffmpeg", args, { timeout: 180000, maxBuffer: 15 * 1024 * 1024 });
}

export async function generateTikTokVideo(
  input: VideoGenerationInput
): Promise<VideoGenerationResult> {
  const { article, script, settings, audioPath } = input;
  const videoDir = path.join(process.cwd(), "public", "generated", "videos");
  const tempDir = path.join(process.cwd(), "public", "generated", "temp", article.id);
  await mkdir(videoDir, { recursive: true });
  await mkdir(tempDir, { recursive: true });

  const outputFilename = `${article.id}.mp4`;
  const outputPath = path.join(videoDir, outputFilename);
  const publicPath = `/generated/videos/${outputFilename}`;

  // 1. Extract & download images
  let imageUrls = await extractArticleImages(article);
  console.log(`[generateTikTokVideo] articleId=${article.id} extracted ${imageUrls.length} URL(s)`);

  let { localPaths, publicPaths } = await downloadImages(article.id, imageUrls, article.category);
  localPaths = await ensureMinimumImages(article.id, localPaths, article.title, article.category);

  const imageCount = localPaths.length;
  console.log(`[generateTikTokVideo] articleId=${article.id} using ${imageCount} local image(s)`);

  // 2. Resolve audio duration
  const fullAudioPath = audioPath
    ? path.join(process.cwd(), "public", audioPath.replace(/^\//, ""))
    : null;

  let duration = 40;
  const voiceoverSkipped = !fullAudioPath || !(await fileExists(fullAudioPath));

  if (!voiceoverSkipped && fullAudioPath) {
    const audioDur = await getAudioDurationSeconds(fullAudioPath);
    if (audioDur) {
      duration = Math.min(60, Math.max(30, audioDur + 1));
      console.log(`[generateTikTokVideo] audio duration=${audioDur.toFixed(1)}s → video=${duration}s`);
    }
  } else {
    const narration = getVoiceoverText(script);
    duration = Math.min(60, Math.max(30, estimateSpeechDuration(narration)));
    console.log(`[generateTikTokVideo] no audio — estimated duration=${duration}s`);
  }

  // 3. Build synced subtitles
  let subtitles = parseSubtitles(script.subtitles);
  if (!subtitles.length) {
    subtitles = buildSubtitlesFromText(getVoiceoverText(script), duration);
  } else {
    subtitles = syncSubtitlesToDuration(subtitles, duration);
  }

  const assPath = path.join(tempDir, "subs.ass");
  await writeFile(assPath, buildAssFile(subtitles, assPath), "utf-8");

  // 4. Create image segments
  const segmentDuration = duration / imageCount;
  const segmentPaths: string[] = [];

  for (let i = 0; i < localPaths.length; i++) {
    const segPath = path.join(tempDir, `seg-${i}.mp4`);
    await createImageSegment(localPaths[i], segPath, segmentDuration, i);
    segmentPaths.push(segPath);
    console.log(`[generateTikTokVideo] segment ${i + 1}/${imageCount} (${segmentDuration.toFixed(1)}s)`);
  }

  // 5. Concat segments
  const concatPath = path.join(tempDir, "concat.mp4");
  await concatSegments(segmentPaths, concatPath);

  // 6. Overlays + audio mix
  const watermark = settings.watermarkEnabled ? settings.publicationName : "";
  await applyOverlaysAndAudio(concatPath, outputPath, {
    title: script.tiktokTitle || article.title,
    watermark,
    assPath,
    audioPath: voiceoverSkipped ? null : fullAudioPath,
    duration,
  });

  // Cleanup temp segments
  for (const seg of segmentPaths) {
    await unlink(seg).catch(() => {});
  }
  await unlink(concatPath).catch(() => {});

  console.log(
    `[generateTikTokVideo] DONE articleId=${article.id} images=${imageCount} ` +
      `audio=${voiceoverSkipped ? "skipped" : fullAudioPath} duration=${duration}s path=${publicPath}`
  );

  return {
    videoPath: publicPath,
    duration,
    voiceoverSkipped,
    imageCount,
    downloadedImages: publicPaths,
    audioPath: voiceoverSkipped ? null : audioPath || null,
  };
}
