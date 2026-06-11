const BLOCKED_VIDEO_HOSTS = [
  "youtube.com",
  "youtu.be",
  "facebook.com",
  "fb.watch",
  "instagram.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "vimeo.com",
  "dailymotion.com",
  "twitch.tv",
];

const DIRECT_VIDEO_EXT = /\.(mp4|webm|mov)(\?|$)/i;

export interface ExtractedVideo {
  url: string;
  kind: "direct" | "meta";
  domain: string;
}

export function parseAllowedVideoDomains(
  allowedVideoDomains: string,
  baseUrl: string
): string[] {
  const raw = allowedVideoDomains?.trim();
  if (raw) {
    if (raw.startsWith("[")) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((d) => String(d).trim().toLowerCase()).filter(Boolean);
        }
      } catch {
        // fall through
      }
    }
    return raw
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
  }

  try {
    const host = new URL(baseUrl).hostname.toLowerCase().replace(/^www\./, "");
    return host ? [host] : [];
  } catch {
    return [];
  }
}

function normalizeHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isBlockedVideoHost(url: string): boolean {
  const host = normalizeHost(url);
  if (!host) return true;
  return BLOCKED_VIDEO_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

export function isDirectVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("blob:") || lower.includes("data:")) return false;
  if (DIRECT_VIDEO_EXT.test(lower)) return true;
  return lower.includes("/video/") && (lower.includes(".mp4") || lower.includes("format=mp4"));
}

export function isAuthorizedVideoUrl(url: string, allowedDomains: string[]): boolean {
  if (isBlockedVideoHost(url)) return false;
  if (!isDirectVideoUrl(url)) return false;

  const host = normalizeHost(url);
  if (!host) return false;

  if (!allowedDomains.length) return false;

  return allowedDomains.some(
    (domain) => host === domain || host.endsWith(`.${domain}`)
  );
}

export function dedupeVideoUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const url of urls) {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      const key = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(parsed.href);
    } catch {
      // skip invalid
    }
  }

  return result;
}
