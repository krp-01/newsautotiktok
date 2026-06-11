import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enqueueJob } from "@/lib/jobs/queue";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;

    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) return jsonError("Article not found", 404);

    await prisma.article.update({
      where: { id },
      data: { approved: true },
    });

    if (article.status === "SCRIPT_GENERATED") {
      await enqueueJob("GENERATE_VIDEO", { articleId: id });
    }

    await logAudit("ARTICLE_APPROVED", {
      userId: user.id,
      entity: "Article",
      entityId: id,
    });

    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
