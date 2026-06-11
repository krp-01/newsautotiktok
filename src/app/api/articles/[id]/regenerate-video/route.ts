import { requireSession } from "@/lib/auth";
import { runGenerateVideo } from "@/lib/pipeline/generateContent";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const article = await prisma.article.findUnique({
      where: { id },
      include: { script: true, video: true },
    });
    if (!article) return jsonError("Article not found", 404);
    if (!article.script) return jsonError("Script required before regenerating video", 400);
    if (!article.video) return jsonError("No existing video to regenerate", 400);

    const result = await runGenerateVideo(id, { regenerate: true });

    if (!result.success) {
      return jsonError(result.error || "Video regeneration failed", 500);
    }

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
