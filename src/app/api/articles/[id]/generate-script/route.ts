import { requireSession } from "@/lib/auth";
import { runGenerateScript } from "@/lib/pipeline/generateContent";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) return jsonError("Article not found", 404);

    const result = await runGenerateScript(id);

    if (!result.success) {
      return jsonError(result.error || "Script generation failed", 500);
    }

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
