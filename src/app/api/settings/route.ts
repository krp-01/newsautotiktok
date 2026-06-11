import { NextRequest } from "next/server";
import { requireAdmin, requireSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { jsonOk, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireSession();
    const settings = await getSettings();
    return jsonOk(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();

    const settings = await prisma.appSettings.update({
      where: { id: "default" },
      data: {
        publicationName: body.publicationName,
        logoPath: body.logoPath,
        defaultHashtags: body.defaultHashtags,
        autoPosting: body.autoPosting,
        autoApprove: body.autoApprove,
        fetchIntervalMinutes: body.fetchIntervalMinutes,
        videoTemplateStyle: body.videoTemplateStyle,
        watermarkEnabled: body.watermarkEnabled,
      },
    });

    await logAudit("SETTINGS_UPDATED", { userId: user.id });

    return jsonOk(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
