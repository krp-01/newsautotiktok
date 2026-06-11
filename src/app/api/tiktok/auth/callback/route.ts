import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(
      `${baseUrl}/admin/tiktok?error=${encodeURIComponent(error || "Authorization denied")}`
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      `${baseUrl}/admin/tiktok?error=${encodeURIComponent("TikTok API not configured")}`
    );
  }

  try {
    const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Token exchange failed");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const openId = tokenData.open_id;

    const userResponse = await fetch("https://open.tiktokapis.com/v2/user/info/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: ["display_name", "username"] }),
    });

    let displayName = "TikTok User";
    let username = openId;

    if (userResponse.ok) {
      const userData = await userResponse.json();
      displayName = userData.data?.user?.display_name || displayName;
      username = userData.data?.user?.username || username;
    }

    await prisma.tikTokAccount.upsert({
      where: { openId },
      update: {
        displayName,
        username,
        accessTokenEncrypted: encrypt(accessToken),
        refreshTokenEncrypted: refreshToken ? encrypt(refreshToken) : null,
        status: "ACTIVE",
      },
      create: {
        displayName,
        username,
        openId,
        accessTokenEncrypted: encrypt(accessToken),
        refreshTokenEncrypted: refreshToken ? encrypt(refreshToken) : null,
        status: "ACTIVE",
      },
    });

    return NextResponse.redirect(`${baseUrl}/admin/tiktok?success=connected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth failed";
    return NextResponse.redirect(
      `${baseUrl}/admin/tiktok?error=${encodeURIComponent(message)}`
    );
  }
}
