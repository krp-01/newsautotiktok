import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchNewsFromSource } from "@/lib/rss/fetchNews";
import { enqueueJob } from "@/lib/jobs/queue";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const source = await prisma.source.findUnique({ where: { id } });
    if (!source) return jsonError("Source not found", 404);

    const result = await fetchNewsFromSource(source);

    if (source.autoMode) {
      const newArticles = await prisma.article.findMany({
        where: { sourceId: id, status: "NEW" },
      });
      for (const article of newArticles) {
        await enqueueJob("GENERATE_SCRIPT", { articleId: article.id });
      }
    }

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
