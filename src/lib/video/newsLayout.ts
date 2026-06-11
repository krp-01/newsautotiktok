import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import path from "path";
import type { SubtitleSegment } from "../ai/generateScript";
import { categoryBadgeLabel } from "../ai/romanian";

const execFileAsync = promisify(execFile);

export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
export const CARD_W = 960;
export const CARD_H = 540;
export const CARD_Y = 580;

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
    path.join(process.env.WINDIR || "C:\\Windows", "Fonts", "arialbd.ttf"),
    path.join(process.env.WINDIR || "C:\\Windows", "Fonts", "arial.ttf"),
    path.join(process.env.WINDIR || "C:\\Windows", "Fonts", "segoeui.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
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

export function buildAssFile(subtitles: SubtitleSegment[]): string {
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
Style: Default,Arial,54,&H00FFFFFF,&H000000FF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,4,1,2,60,60,260,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${lines.join("\n")}
`;
}

function newsCardFilter(index: number, duration: number): string {
  const frames = Math.ceil(duration * FPS);
  const zoomDir = index % 2 === 0 ? "in" : "out";
  const zoomExpr =
    zoomDir === "in"
      ? `min(zoom+0.0005,1.08)`
      : `if(lte(zoom,1.0),1.08,max(1.0,zoom-0.0005))`;

  return [
    `[0:v]split=2[bgsrc][cardsrc]`,
    `[bgsrc]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},boxblur=22:6[bg]`,
    `[cardsrc]scale=${CARD_W}:${CARD_H}:force_original_aspect_ratio=decrease,pad=${CARD_W}:${CARD_H}:(ow-iw)/2:(oh-ih)/2:color=0x111827,zoompan=z='${zoomExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${CARD_W}x${CARD_H}:fps=${FPS}[card]`,
    `[bg]drawbox=x=0:y=0:w=iw:h=300:color=0x0d1b2a@0.86:t=fill[top]`,
    `[top][card]overlay=(W-w)/2:${CARD_Y}[layer]`,
    `[layer]drawbox=x=36:y=${CARD_Y - 10}:w=${CARD_W + 12}:h=${CARD_H + 20}:color=0xffffff@0.15:t=4[framed]`,
    `[framed]drawbox=x=0:y=ih-220:w=iw:h=220:color=0x000000@0.55:t=fill,fade=t=in:st=0:d=0.35,fade=t=out:st=${Math.max(0, duration - 0.45)}:d=0.45`,
  ].join(";");
}

export async function createImageNewsSegment(
  imagePath: string,
  outputPath: string,
  duration: number,
  index: number
): Promise<void> {
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-loop",
      "1",
      "-i",
      imagePath,
      "-t",
      String(duration),
      "-filter_complex",
      newsCardFilter(index, duration),
      "-an",
      "-pix_fmt",
      "yuv420p",
      outputPath,
    ],
    { timeout: 120000, maxBuffer: 15 * 1024 * 1024 }
  );
}

export async function createVideoNewsSegment(
  videoPath: string,
  outputPath: string,
  duration: number,
  index: number,
  startAt = 0
): Promise<void> {
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-ss",
      String(startAt),
      "-t",
      String(duration),
      "-i",
      videoPath,
      "-filter_complex",
      newsCardFilter(index, duration),
      "-an",
      "-pix_fmt",
      "yuv420p",
      outputPath,
    ],
    { timeout: 180000, maxBuffer: 20 * 1024 * 1024 }
  );
}

export async function concatSegments(segmentPaths: string[], outputPath: string): Promise<void> {
  const { writeFile, unlink } = await import("fs/promises");
  const listPath = outputPath.replace(".mp4", "-list.txt");
  const listContent = segmentPaths
    .map((p) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
    .join("\n");
  await writeFile(listPath, listContent, "utf-8");

  await execFileAsync(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outputPath],
    { timeout: 180000, maxBuffer: 15 * 1024 * 1024 }
  );

  await unlink(listPath).catch(() => {});
}

export interface FinalComposeOptions {
  title: string;
  category: string;
  sourceName: string;
  watermark: string;
  assPath: string | null;
  audioPath: string | null;
  duration: number;
}

export async function composeFinalNewsVideo(
  inputVideo: string,
  outputPath: string,
  options: FinalComposeOptions
): Promise<void> {
  const filters: string[] = [];
  const headline = escapeDrawtext(options.title.slice(0, 100));
  const badge = escapeDrawtext(categoryBadgeLabel(options.category));
  const sourceLine = escapeDrawtext(`${options.sourceName} · ${categoryBadgeLabel(options.category)}`);

  filters.push(
    `drawtext=${drawtextOpts(
      `text='${headline}':fontsize=46:fontcolor=white:borderw=3:bordercolor=black@0.85:box=1:boxcolor=0x0d1b2a@0.55:boxborderw=10:x=(w-text_w)/2:y=90`
    )}`
  );
  filters.push(
    `drawtext=${drawtextOpts(
      `text='${badge}':fontsize=28:fontcolor=white:borderw=2:bordercolor=0x2563eb@0.9:box=1:boxcolor=0x2563eb@0.75:boxborderw=8:x=48:y=34`
    )}`
  );
  filters.push(
    `drawtext=${drawtextOpts(
      `text='${sourceLine}':fontsize=24:fontcolor=white@0.9:box=1:boxcolor=black@0.45:boxborderw=6:x=48:y=h-300`
    )}`
  );

  if (options.watermark) {
    filters.push(
      `drawtext=${drawtextOpts(
        `text='${escapeDrawtext(options.watermark)}':fontsize=22:fontcolor=white@0.7:x=w-text_w-36:y=36`
      )}`
    );
  }

  if (options.assPath && existsSync(options.assPath)) {
    filters.push(`ass='${escapeFilterPath(options.assPath)}'`);
  }

  const args = ["-y", "-i", inputVideo];
  let audioIdx = -1;

  if (options.audioPath && existsSync(options.audioPath)) {
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

  await execFileAsync("ffmpeg", args, { timeout: 240000, maxBuffer: 20 * 1024 * 1024 });
}

export function clampVideoDuration(seconds: number): number {
  return Math.min(60, Math.max(35, seconds));
}

export function sceneDuration(totalDuration: number, sceneCount: number): number {
  const raw = totalDuration / Math.max(sceneCount, 1);
  return Math.min(6, Math.max(4, raw));
}

export type SceneMedia =
  | { type: "image"; path: string }
  | { type: "video"; path: string; startAt?: number };

export function buildScenePlan(
  images: string[],
  sourceVideos: string[],
  totalDuration: number
): SceneMedia[] {
  const pool: SceneMedia[] = [];

  for (const videoPath of sourceVideos) {
    pool.push({ type: "video", path: videoPath, startAt: 0 });
  }
  for (const imagePath of images) {
    pool.push({ type: "image", path: imagePath });
  }

  if (!pool.length) return [];

  const perScene = sceneDuration(totalDuration, Math.max(pool.length, Math.ceil(totalDuration / 5)));
  const targetScenes = Math.max(3, Math.ceil(totalDuration / perScene));
  const scenes: SceneMedia[] = [];

  for (let i = 0; i < targetScenes; i++) {
    scenes.push(pool[i % pool.length]);
  }

  return scenes;
}
