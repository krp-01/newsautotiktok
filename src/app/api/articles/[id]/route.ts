import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, handleApiError } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        source: true,
        script: true,
        video: true,
        tiktokPosts: { include: { account: true } },
      },
    });

    return jsonOk(article);
  } catch (error) {
    return handleApiError(error);
  }
}
