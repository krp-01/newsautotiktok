import { NextRequest } from "next/server";
import { requireAdmin, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireSession();
    const accounts = await prisma.tikTokAccount.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        displayName: true,
        username: true,
        openId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { posts: true } },
      },
    });
    return jsonOk(accounts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { displayName, username, openId, accessToken, refreshToken, status } = body;

    if (!displayName || !username || !openId || !accessToken) {
      return jsonError("displayName, username, openId and accessToken are required");
    }

    const account = await prisma.tikTokAccount.create({
      data: {
        displayName,
        username,
        openId,
        accessTokenEncrypted: encrypt(accessToken),
        refreshTokenEncrypted: refreshToken ? encrypt(refreshToken) : null,
        status: status || "ACTIVE",
      },
    });

    return jsonOk(
      {
        id: account.id,
        displayName: account.displayName,
        username: account.username,
        openId: account.openId,
        status: account.status,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
