import { prisma } from "../prisma";
import { fetchNewsFromSource, fetchAllActiveSources } from "../rss/fetchNews";
import { postVideoToTikTok } from "../tiktok/postVideo";
import { getSettings } from "../settings";
import {
  runGenerateScript,
  runGenerateVideo,
  runGenerateScriptAndVideo,
  enqueueVideoAfterScript,
} from "../pipeline/generateContent";
import type { Job } from "@/generated/prisma/client";

function logJob(job: Job, message: string) {
  console.log(`[Job ${job.id}] [${job.type}] ${message}`);
}

function logJobError(job: Job, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[Job ${job.id}] [${job.type}] FAILED: ${message}`);
  if (stack) console.error(stack);
  return message;
}

function parsePayload(job: Job): Record<string, unknown> | null {
  if (!job.payload) return null;
  try {
    return JSON.parse(job.payload);
  } catch {
    throw new Error(`Invalid job payload JSON: ${job.payload}`);
  }
}

async function processFetchNews(payload: Record<string, unknown> | null) {
  if (payload?.sourceId && typeof payload.sourceId === "string") {
    const source = await prisma.source.findUnique({ where: { id: payload.sourceId } });
    if (!source) throw new Error("Source not found");
    return fetchNewsFromSource(source);
  }
  return fetchAllActiveSources();
}

async function processGenerateScript(payload: Record<string, unknown> | null) {
  const articleId = payload?.articleId as string | undefined;
  if (!articleId) throw new Error("articleId required in job payload");

  const result = await runGenerateScript(articleId);
  if (!result.success) {
    throw new Error(result.error || "Script generation failed");
  }

  await enqueueVideoAfterScript(articleId);
  return result;
}

async function processGenerateVideo(payload: Record<string, unknown> | null) {
  const articleId = payload?.articleId as string | undefined;
  const regenerate = payload?.regenerate === true;
  if (!articleId) throw new Error("articleId required");

  const result = await runGenerateVideo(articleId, { regenerate });
  if (!result.success) {
    throw new Error(result.error || "Video generation failed");
  }
  return result;
}

async function processPostToTikTok(payload: Record<string, unknown> | null) {
  const articleId = payload?.articleId as string | undefined;
  const accountId = payload?.accountId as string | undefined;
  if (!articleId || !accountId) throw new Error("articleId and accountId required");

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { script: true, video: true },
  });
  if (!article?.video || !article.script) {
    throw new Error("Article video or script missing");
  }

  const result = await postVideoToTikTok({
    accountId,
    videoPath: article.video.videoPath,
    title: article.script.tiktokTitle,
    description: `${article.script.description}\n\n${article.script.hashtags}`,
    articleId: article.id,
  });

  if (result.success) {
    await prisma.article.update({
      where: { id: article.id },
      data: { status: "POSTED" },
    });
  } else {
    await prisma.article.update({
      where: { id: article.id },
      data: { status: "FAILED" },
    });
    throw new Error(result.error || "TikTok posting failed");
  }

  return result;
}

export async function processJob(job: Job): Promise<unknown> {
  logJob(job, `Starting (payload: ${job.payload ?? "none"})`);

  await prisma.job.update({
    where: { id: job.id },
    data: { status: "RUNNING", startedAt: new Date(), errorMessage: null },
  });

  const payload = parsePayload(job);

  try {
    let result: unknown;

    switch (job.type) {
      case "FETCH_NEWS":
        result = await processFetchNews(payload);
        break;
      case "GENERATE_SCRIPT":
        result = await processGenerateScript(payload);
        break;
      case "GENERATE_VIDEO":
        result = await processGenerateVideo(payload);
        break;
      case "POST_TO_TIKTOK":
        result = await processPostToTikTok(payload);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "DONE", completedAt: new Date(), errorMessage: null },
    });

    logJob(job, "Completed successfully");
    return result;
  } catch (error) {
    const message = logJobError(job, error);
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: message, completedAt: new Date() },
    });
    throw error;
  }
}

export async function runPendingJobs(limit = 10) {
  const jobs = await prisma.job.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  console.log(`[runPendingJobs] Processing ${jobs.length} pending job(s)`);

  const results: { jobId: string; success: boolean; error?: string }[] = [];

  for (const job of jobs) {
    try {
      await processJob(job);
      results.push({ jobId: job.id, success: true });
    } catch (error) {
      results.push({
        jobId: job.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

export async function runAutomationPipeline() {
  const settings = await getSettings();
  const results = {
    fetch: null as unknown,
    scripts: 0,
    videos: 0,
    posts: 0,
    errors: [] as string[],
  };

  try {
    results.fetch = await fetchAllActiveSources();
  } catch (error) {
    results.errors.push(`Fetch: ${error instanceof Error ? error.message : "error"}`);
  }

  // Articles needing full pipeline: NEW or SCRIPT_GENERATED without video
  const articlesToProcess = await prisma.article.findMany({
    where: {
      OR: [
        { status: "NEW" },
        { status: "SCRIPT_GENERATED", video: null },
      ],
    },
    include: { script: true, video: true },
    take: 20,
  });

  for (const article of articlesToProcess) {
    try {
      const pipeline = await runGenerateScriptAndVideo(article.id);
      if (pipeline.script.success) results.scripts++;
      if (pipeline.video.success && !pipeline.video.skipped) results.videos++;
      if (!pipeline.video.success && pipeline.script.success) {
        results.errors.push(`Video ${article.id}: ${pipeline.video.error}`);
      }
      if (!pipeline.script.success) {
        results.errors.push(`Script ${article.id}: ${pipeline.script.error}`);
      }
    } catch (error) {
      results.errors.push(`${article.id}: ${error instanceof Error ? error.message : "error"}`);
    }
  }

  if (settings.autoPosting) {
    const readyArticles = await prisma.article.findMany({
      where: { status: "READY_TO_POST" },
      take: 5,
    });
    const account = await prisma.tikTokAccount.findFirst({
      where: { status: "ACTIVE" },
    });

    if (account) {
      for (const article of readyArticles) {
        try {
          await processPostToTikTok({ articleId: article.id, accountId: account.id });
          results.posts++;
        } catch (error) {
          results.errors.push(`Post ${article.id}: ${error instanceof Error ? error.message : "error"}`);
        }
      }
    }
  }

  return results;
}
