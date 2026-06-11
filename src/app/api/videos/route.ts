import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireSession();
    const videos = await prisma.generatedVideo.findMany({
      include: {
        article: {
          select: {
            id: true,
            title: true,
            status: true,
            category: true,
            source: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(videos);
  } catch (error) {
    return handleApiError(error);
  }
}
