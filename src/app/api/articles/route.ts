import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, handleApiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const articles = await prisma.article.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        source: { select: { name: true } },
        script: true,
        video: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return jsonOk(articles);
  } catch (error) {
    return handleApiError(error);
  }
}
