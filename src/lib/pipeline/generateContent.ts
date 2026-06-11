import { prisma } from "../prisma";
import { generateScript } from "../ai/generateScript";
import { generateVoiceover } from "../tts/generateVoiceover";
import { generateTikTokVideo } from "../video/generateTikTokVideo";
import { enqueueJob } from "../jobs/queue";
import { getSettings } from "../settings";
import { getVoiceoverText } from "../media/subtitles";

export interface ScriptStepResult {
  success: boolean;
  skipped?: boolean;
  articleId: string;
  provider?: string;
  voiceoverSkipped?: boolean;
  error?: string;
}

export interface VideoStepResult {
  success: boolean;
  skipped?: boolean;
  articleId: string;
  videoPath?: string;
  imageCount?: number;
  voiceoverSkipped?: boolean;
  voiceoverReason?: string;
  voiceoverProvider?: string;
  duration?: number;
  error?: string;
}

export interface PipelineResult {
  script: ScriptStepResult;
  video: VideoStepResult;
}

export async function runGenerateScript(articleId: string): Promise<ScriptStepResult> {
  console.log(`[runGenerateScript] articleId=${articleId}`);

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { script: true },
  });

  if (!article) {
    return { success: false, articleId, error: "Article not found" };
  }

  if (article.script) {
    console.log(`[runGenerateScript] Script exists, skipping articleId=${articleId}`);
    await prisma.article.update({
      where: { id: articleId },
      data: { status: "SCRIPT_GENERATED" },
    });
    return { success: true, skipped: true, articleId, voiceoverSkipped: article.script.voiceoverSkipped };
  }

  try {
    const scriptResult = await generateScript(article);
    const voiceoverScript = scriptResult.script;

    await prisma.generatedScript.create({
      data: {
        articleId: article.id,
        hook: scriptResult.hook,
        script: scriptResult.script,
        voiceoverScript,
        tiktokTitle: scriptResult.tiktokTitle,
        description: scriptResult.description,
        hashtags: scriptResult.hashtags,
        subtitles: JSON.stringify(scriptResult.subtitles),
        voiceoverSkipped: true,
      },
    });

    await prisma.article.update({
      where: { id: article.id },
      data: { status: "SCRIPT_GENERATED" },
    });

    console.log(`[runGenerateScript] Done articleId=${articleId} provider=${scriptResult.provider}`);
    return { success: true, articleId, provider: scriptResult.provider, voiceoverSkipped: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Script generation failed";
    console.error(`[runGenerateScript] Failed articleId=${articleId}: ${message}`);
    return { success: false, articleId, error: message };
  }
}

export async function runGenerateVideo(
  articleId: string,
  options?: { regenerate?: boolean }
): Promise<VideoStepResult> {
  console.log(`[runGenerateVideo] articleId=${articleId} regenerate=${!!options?.regenerate}`);

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { script: true, video: true },
  });

  if (!article) {
    return { success: false, articleId, error: "Article not found" };
  }

  if (!article.script) {
    return { success: false, articleId, error: "Script not generated yet" };
  }

  if (article.video && !options?.regenerate) {
    return {
      success: true,
      skipped: true,
      articleId,
      videoPath: article.video.videoPath,
      imageCount: article.video.imageCount,
      voiceoverSkipped: article.video.voiceoverSkipped,
      duration: article.video.duration ?? undefined,
    };
  }

  if (article.video && options?.regenerate) {
    await prisma.generatedVideo.delete({ where: { articleId } });
  }

  try {
    const settings = await getSettings();
    const narration = getVoiceoverText(article.script);

    console.log(`[runGenerateVideo] Generating voice-over articleId=${articleId}`);
    const voiceover = await generateVoiceover(narration, article.id);

    console.log(
      `[runGenerateVideo] TTS result: skipped=${voiceover.skipped} provider=${voiceover.provider} ` +
        `path=${voiceover.audioPath || "none"} reason=${voiceover.reason || "none"}`
    );

    await prisma.generatedScript.update({
      where: { articleId },
      data: { voiceoverSkipped: voiceover.skipped },
    });

    const videoResult = await generateTikTokVideo({
      article,
      script: article.script,
      settings,
      audioPath: voiceover.audioPath,
    });

    await prisma.generatedVideo.create({
      data: {
        articleId: article.id,
        videoPath: videoResult.videoPath,
        audioPath: videoResult.audioPath,
        duration: Math.round(videoResult.duration * 10) / 10,
        imageCount: videoResult.imageCount,
        downloadedImages: JSON.stringify(videoResult.downloadedImages),
        voiceoverSkipped: videoResult.voiceoverSkipped,
      },
    });

    await prisma.article.update({
      where: { id: article.id },
      data: { status: "READY_TO_POST" },
    });

    const updatedSettings = await getSettings();
    if (updatedSettings.autoPosting) {
      const account = await prisma.tikTokAccount.findFirst({ where: { status: "ACTIVE" } });
      if (account) {
        await enqueueJob("POST_TO_TIKTOK", { articleId: article.id, accountId: account.id });
      }
    }

    console.log(
      `[runGenerateVideo] Done articleId=${articleId} images=${videoResult.imageCount} ` +
        `duration=${videoResult.duration}s path=${videoResult.videoPath}`
    );

    return {
      success: true,
      articleId,
      videoPath: videoResult.videoPath,
      imageCount: videoResult.imageCount,
      voiceoverSkipped: videoResult.voiceoverSkipped,
      voiceoverReason: voiceover.skipped ? voiceover.reason : undefined,
      voiceoverProvider: voiceover.skipped ? undefined : voiceover.provider,
      duration: videoResult.duration,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video generation failed";
    console.error(`[runGenerateVideo] Failed articleId=${articleId}: ${message}`);

    await prisma.article.update({
      where: { id: articleId },
      data: { status: "SCRIPT_GENERATED" },
    });

    await prisma.job.create({
      data: {
        type: "GENERATE_VIDEO",
        status: "FAILED",
        payload: JSON.stringify({ articleId }),
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    return { success: false, articleId, error: message };
  }
}

export async function runGenerateScriptAndVideo(articleId: string): Promise<PipelineResult> {
  const script = await runGenerateScript(articleId);
  if (!script.success) {
    return {
      script,
      video: { success: false, articleId, error: "Skipped — script generation failed" },
    };
  }
  const video = await runGenerateVideo(articleId);
  return { script, video };
}

export async function enqueueVideoAfterScript(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { video: true },
  });
  if (!article?.video) {
    await enqueueJob("GENERATE_VIDEO", { articleId });
  }
}
