import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "../prisma";
import { decrypt } from "../crypto";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

export interface PostVideoInput {
  accountId: string;
  videoPath: string;
  title: string;
  description: string;
  articleId: string;
}

export interface PostVideoResult {
  success: boolean;
  tiktokVideoId?: string;
  error?: string;
  postId?: string;
}

function isTikTokConfigured(): boolean {
  return !!(
    process.env.TIKTOK_CLIENT_KEY &&
    process.env.TIKTOK_CLIENT_SECRET &&
    process.env.TIKTOK_REDIRECT_URI
  );
}

async function refreshAccessToken(
  accountId: string,
  refreshToken: string
): Promise<string | null> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) return null;

  const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!data.access_token) return null;

  const { encrypt } = await import("../crypto");
  await prisma.tikTokAccount.update({
    where: { id: accountId },
    data: {
      accessTokenEncrypted: encrypt(data.access_token),
      refreshTokenEncrypted: data.refresh_token
        ? encrypt(data.refresh_token)
        : undefined,
    },
  });

  return data.access_token;
}

async function initVideoUpload(
  accessToken: string,
  videoSize: number
): Promise<{ uploadUrl: string; publishId: string } | null> {
  const response = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: "",
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: videoSize,
        total_chunk_count: 1,
      },
    }),
  });

  if (!response.ok) {
    console.error("TikTok init upload failed:", await response.text());
    return null;
  }

  const data = await response.json();
  return {
    uploadUrl: data.data?.upload_url,
    publishId: data.data?.publish_id,
  };
}

export async function postVideoToTikTok(input: PostVideoInput): Promise<PostVideoResult> {
  if (!isTikTokConfigured()) {
    return { success: false, error: "TikTok API not configured" };
  }

  const account = await prisma.tikTokAccount.findUnique({
    where: { id: input.accountId },
  });

  if (!account) {
    return { success: false, error: "TikTok account not found" };
  }

  if (account.status !== "ACTIVE") {
    return { success: false, error: "TikTok account is not active" };
  }

  let accessToken: string;
  try {
    accessToken = decrypt(account.accessTokenEncrypted);
  } catch {
    return { success: false, error: "Failed to decrypt access token" };
  }

  const fullVideoPath = path.join(
    process.cwd(),
    "public",
    input.videoPath.replace(/^\//, "")
  );

  let videoBuffer: Buffer;
  try {
    videoBuffer = await readFile(fullVideoPath);
  } catch {
    return { success: false, error: "Video file not found" };
  }

  const post = await prisma.tikTokPost.create({
    data: {
      articleId: input.articleId,
      accountId: input.accountId,
      status: "PENDING",
    },
  });

  try {
    let uploadInfo = await initVideoUpload(accessToken, videoBuffer.length);

    if (!uploadInfo && account.refreshTokenEncrypted) {
      const refreshToken = decrypt(account.refreshTokenEncrypted);
      const newToken = await refreshAccessToken(input.accountId, refreshToken);
      if (newToken) {
        accessToken = newToken;
        uploadInfo = await initVideoUpload(accessToken, videoBuffer.length);
      }
    }

    if (!uploadInfo?.uploadUrl) {
      await prisma.tikTokPost.update({
        where: { id: post.id },
        data: { status: "FAILED", errorMessage: "Failed to initialize TikTok upload" },
      });
      return { success: false, error: "Failed to initialize TikTok upload", postId: post.id };
    }

    const uploadResponse = await fetch(uploadInfo.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(videoBuffer.length),
      },
      body: new Uint8Array(videoBuffer),
    });

    if (!uploadResponse.ok) {
      await prisma.tikTokPost.update({
        where: { id: post.id },
        data: { status: "FAILED", errorMessage: "Video upload to TikTok failed" },
      });
      return { success: false, error: "Video upload to TikTok failed", postId: post.id };
    }

    const publishResponse = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: uploadInfo.publishId }),
    });

    let tiktokVideoId = uploadInfo.publishId;
    if (publishResponse.ok) {
      const publishData = await publishResponse.json();
      tiktokVideoId = publishData.data?.publicaly_available_post_id?.[0] || uploadInfo.publishId;
    }

    await prisma.tikTokPost.update({
      where: { id: post.id },
      data: {
        status: "POSTED",
        tiktokVideoId,
        postedAt: new Date(),
      },
    });

    return { success: true, tiktokVideoId, postId: post.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.tikTokPost.update({
      where: { id: post.id },
      data: { status: "FAILED", errorMessage: message },
    });
    return { success: false, error: message, postId: post.id };
  }
}
