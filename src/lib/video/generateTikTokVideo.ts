import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import type { Article, GeneratedScript, AppSettings, Source } from "@/generated/prisma/client";
import { extractArticleImages } from "../media/extractArticleImages";
import { extractArticleVideos } from "../media/extractArticleVideos";
import { downloadImages, ensureMinimumImages } from "../media/downloadImages";
import { downloadSourceVideos } from "../media/downloadSourceVideos";
import { getAudioDurationSeconds, estimateSpeechDuration } from "../media/ffprobe";
import {
  parseSubtitles,
  syncSubtitlesToDuration,
  buildSubtitlesFromText,
  getVoiceoverText,
  subtitleTextForTts,
} from "../media/subtitles";
import {
  buildAssFile,
  buildScenePlan,
  clampVideoDuration,
  composeFinalNewsVideo,
  concatSegments,
  createImageNewsSegment,
  createVideoNewsSegment,
  sceneDuration,
} from "./newsLayout";

export interface VideoGenerationInput {
  article: Article & { source: Source };
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
  sourceVideoUsed: boolean;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const { access } = await import("fs/promises");
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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

  const imageUrls = await extractArticleImages(article);
  console.log(`[generateTikTokVideo] articleId=${article.id} extracted ${imageUrls.length} image URL(s)`);

  let { localPaths, publicPaths } = await downloadImages(article.id, imageUrls, article.category);
  localPaths = await ensureMinimumImages(article.id, localPaths, article.title, article.category);
  const imageCount = localPaths.length;

  const extractedVideos = await extractArticleVideos(article, article.source);
  const downloadedVideos = await downloadSourceVideos(article.id, extractedVideos);
  const sourceVideoPaths = downloadedVideos.map((v) => v.localPath);
  const sourceVideoUsed = sourceVideoPaths.length > 0;

  if (!sourceVideoUsed && extractedVideos.length === 0 && !article.source.useSourceVideos) {
    console.log(`[generateTikTokVideo] articleId=${article.id} using images only (source videos disabled)`);
  } else if (!sourceVideoUsed) {
    console.log(
      `[generateTikTokVideo] articleId=${article.id} source video unavailable or not authorized — images only`
    );
  }

  const fullAudioPath = audioPath
    ? path.join(process.cwd(), "public", audioPath.replace(/^\//, ""))
    : null;

  const voiceoverSkipped = !fullAudioPath || !(await fileExists(fullAudioPath));
  const narration = getVoiceoverText(script);

  let duration = clampVideoDuration(estimateSpeechDuration(narration));
  if (!voiceoverSkipped && fullAudioPath) {
    const audioDur = await getAudioDurationSeconds(fullAudioPath);
    if (audioDur) {
      duration = clampVideoDuration(audioDur + 1);
      console.log(`[generateTikTokVideo] audio duration=${audioDur.toFixed(1)}s → video=${duration}s`);
    }
  }

  let subtitles = parseSubtitles(script.subtitles);
  if (!subtitles.length) {
    subtitles = buildSubtitlesFromText(narration, duration);
  } else {
    subtitles = syncSubtitlesToDuration(subtitles, duration);
  }

  const assPath = path.join(tempDir, "subs.ass");
  await writeFile(assPath, buildAssFile(subtitles), "utf-8");

  const scenes = buildScenePlan(localPaths, sourceVideoPaths, duration);
  if (!scenes.length) {
    throw new Error("FFmpeg video generation failed: no media scenes available");
  }

  const segmentDuration = sceneDuration(duration, scenes.length);
  const segmentPaths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const segPath = path.join(tempDir, `seg-${i}.mp4`);
    const scene = scenes[i];

    try {
      if (scene.type === "video") {
        await createVideoNewsSegment(scene.path, segPath, segmentDuration, i, scene.startAt || 0);
      } else {
        await createImageNewsSegment(scene.path, segPath, segmentDuration, i);
      }
      segmentPaths.push(segPath);
      console.log(
        `[generateTikTokVideo] segment ${i + 1}/${scenes.length} type=${scene.type} (${segmentDuration.toFixed(1)}s)`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "segment render failed";
      throw new Error(`FFmpeg video generation failed at segment ${i + 1}: ${message}`);
    }
  }

  const concatPath = path.join(tempDir, "concat.mp4");
  await concatSegments(segmentPaths, concatPath);

  const headline = script.headline || script.tiktokTitle || article.title;
  const watermark = settings.watermarkEnabled ? settings.publicationName : "";

  try {
    await composeFinalNewsVideo(concatPath, outputPath, {
      title: headline,
      category: article.category,
      sourceName: article.source.name,
      watermark,
      assPath,
      audioPath: voiceoverSkipped ? null : fullAudioPath,
      duration,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "final compose failed";
    throw new Error(`FFmpeg video generation failed during final compose: ${message}`);
  }

  for (const seg of segmentPaths) {
    await unlink(seg).catch(() => {});
  }
  await unlink(concatPath).catch(() => {});

  console.log(
    `[generateTikTokVideo] DONE articleId=${article.id} images=${imageCount} sourceVideo=${sourceVideoUsed} ` +
      `audio=${voiceoverSkipped ? "skipped" : "yes"} duration=${duration}s`
  );

  return {
    videoPath: publicPath,
    duration,
    voiceoverSkipped,
    imageCount,
    downloadedImages: publicPaths,
    audioPath: voiceoverSkipped ? null : audioPath || null,
    sourceVideoUsed,
  };
}

export { subtitleTextForTts };
