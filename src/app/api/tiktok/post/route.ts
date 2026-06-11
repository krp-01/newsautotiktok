import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postVideoToTikTok } from "@/lib/tiktok/postVideo";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const { articleId, accountId } = await request.json();

    if (!articleId || !accountId) {
      return jsonError("articleId and accountId are required");
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { script: true, video: true },
    });

    if (!article?.video || !article.script) {
      return jsonError("Article must have generated video and script", 400);
    }

    const result = await postVideoToTikTok({
      accountId,
      videoPath: article.video.videoPath,
      title: article.script.tiktokTitle,
      description: `${article.script.description}\n\n${article.script.hashtags}`,
      articleId,
    });

    if (!result.success) {
      return jsonError(result.error || "Posting failed", 500);
    }

    await prisma.article.update({
      where: { id: articleId },
      data: { status: "POSTED" },
    });

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
