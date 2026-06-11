import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireSession();
    const sources = await prisma.source.findMany({ orderBy: { createdAt: "desc" } });
    return jsonOk(sources);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const { name, baseUrl, rssUrl, category, active, autoMode } = body;

    if (!name || !baseUrl || !rssUrl) {
      return jsonError("name, baseUrl and rssUrl are required");
    }

    const source = await prisma.source.create({
      data: {
        name,
        baseUrl,
        rssUrl,
        category: category || "general",
        active: active ?? true,
        autoMode: autoMode ?? false,
      },
    });

    await logAudit("SOURCE_CREATED", {
      userId: user.id,
      entity: "Source",
      entityId: source.id,
      details: source.name,
    });

    return jsonOk(source, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
