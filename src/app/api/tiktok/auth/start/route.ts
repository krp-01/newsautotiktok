import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;

    if (!clientKey || !redirectUri) {
      return jsonError("TikTok API not configured", 503);
    }

    const csrfState = crypto.randomUUID();
    const scope = "user.info.basic,video.publish,video.upload";

    const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
    authUrl.searchParams.set("client_key", clientKey);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", csrfState);

    return jsonOk({ authUrl: authUrl.toString(), state: csrfState });
  } catch (error) {
    return handleApiError(error);
  }
}
