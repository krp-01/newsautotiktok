import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await request.json();

    const source = await prisma.source.update({
      where: { id },
      data: {
        name: body.name,
        baseUrl: body.baseUrl,
        rssUrl: body.rssUrl,
        category: body.category,
        active: body.active,
        autoMode: body.autoMode,
        allowVideoExtraction: body.allowVideoExtraction,
        allowedVideoDomains: body.allowedVideoDomains,
        useSourceVideos: body.useSourceVideos,
      },
    });

    return jsonOk(source);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    await prisma.source.delete({ where: { id } });
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
