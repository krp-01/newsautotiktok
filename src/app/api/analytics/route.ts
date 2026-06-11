import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireSession();

    const [
      activeSources,
      totalArticles,
      generatedVideos,
      successfulPosts,
      failedPosts,
      recentErrors,
      articlesByStatus,
    ] = await Promise.all([
      prisma.source.count({ where: { active: true } }),
      prisma.article.count(),
      prisma.generatedVideo.count(),
      prisma.tikTokPost.count({ where: { status: "POSTED" } }),
      prisma.tikTokPost.count({ where: { status: "FAILED" } }),
      prisma.job.findMany({
        where: { status: "FAILED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          errorMessage: true,
          createdAt: true,
        },
      }),
      prisma.article.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    return jsonOk({
      activeSources,
      totalArticles,
      generatedVideos,
      successfulPosts,
      failedPosts,
      recentErrors,
      articlesByStatus: articlesByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
