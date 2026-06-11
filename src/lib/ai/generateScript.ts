import type { Article } from "@/generated/prisma/client";
import { getSettings } from "../settings";

export interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

export interface GeneratedScriptResult {
  hook: string;
  /** Voice-over script (stored as `script` in DB) */
  script: string;
  tiktokTitle: string;
  /** TikTok description (stored as `description` in DB) */
  description: string;
  hashtags: string;
  subtitles: SubtitleSegment[];
  provider: "openai" | "mock";
}

/** Build usable text from article fields with fallbacks */
export function getArticleSourceText(article: Article & { description?: string | null }): string {
  if (article.content?.trim()) return article.content.trim();
  if (article.description?.trim()) return article.description.trim();
  if (article.title?.trim()) {
    return `${article.title.trim()}${article.url ? `. Sursă: ${article.url}` : ""}`;
  }
  return article.url || "Știre fără conținut disponibil.";
}

function normalizeHashtags(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((tag) => (typeof tag === "string" ? tag.trim() : String(tag)))
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
      .join(" ");
  }
  return fallback;
}

function normalizeSubtitles(value: unknown, script: string): SubtitleSegment[] {
  if (Array.isArray(value) && value.length > 0) {
    return value
      .filter(
        (s): s is SubtitleSegment =>
          typeof s === "object" &&
          s !== null &&
          typeof (s as SubtitleSegment).text === "string"
      )
      .map((s) => ({
        start: Number(s.start) || 0,
        end: Number(s.end) || 0,
        text: String(s.text),
      }));
  }
  return buildSubtitlesFromScript(script);
}

function buildSubtitlesFromScript(script: string): SubtitleSegment[] {
  const words = script.split(/\s+/).filter(Boolean);
  const subtitles: SubtitleSegment[] = [];
  let time = 0;
  const chunkSize = 5;

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    const duration = Math.max(2, chunk.split(" ").length * 0.4);
    subtitles.push({ start: time, end: time + duration, text: chunk });
    time += duration;
  }

  return subtitles;
}

function generateMockScript(
  article: Article & { description?: string | null },
  defaultHashtags: string
): GeneratedScriptResult {
  const sourceText = getArticleSourceText(article);
  const shortTitle =
    article.title.length > 60 ? article.title.slice(0, 57) + "..." : article.title;
  const contentSnippet = sourceText.slice(0, 300);

  const voiceoverScript = `${shortTitle}. ${contentSnippet} Rămâi conectat pentru mai multe știri!`;
  const subtitles = buildSubtitlesFromScript(voiceoverScript);

  return {
    hook: `🔥 ${shortTitle}`,
    script: voiceoverScript,
    tiktokTitle: shortTitle,
    description: `${contentSnippet.slice(0, 150)}${contentSnippet.length > 150 ? "..." : ""}\n\n${defaultHashtags}`,
    hashtags: defaultHashtags,
    subtitles,
    provider: "mock",
  };
}

async function generateWithOpenAI(
  article: Article & { description?: string | null }
): Promise<GeneratedScriptResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const settings = await getSettings();
  const sourceText = getArticleSourceText(article);

  const prompt = `Generează conținut TikTok în română pentru articolul:
Titlu: ${article.title}
Conținut: ${sourceText.slice(0, 2000)}

Returnează JSON cu:
- hook (string)
- script sau voiceoverScript (string, 30-60 sec voice-over)
- tiktokTitle (string)
- description sau tiktokDescription (string)
- hashtags (string cu hashtag-uri separate prin spațiu, NU array)
- subtitles (array cu {start, end, text})`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Ești un editor video pentru TikTok. Răspunde doar cu JSON valid. hashtags trebuie să fie un singur string, nu array.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  const voiceoverScript: string =
    parsed.script || parsed.voiceoverScript || parsed.voice_over_script || "";
  if (!voiceoverScript.trim()) {
    throw new Error("OpenAI returned empty script");
  }

  const tiktokDescription: string =
    parsed.description || parsed.tiktokDescription || parsed.tiktok_description || "";

  return {
    hook: String(parsed.hook || `🔥 ${article.title.slice(0, 60)}`),
    script: voiceoverScript,
    tiktokTitle: String(parsed.tiktokTitle || parsed.tiktok_title || article.title.slice(0, 80)),
    description: tiktokDescription || voiceoverScript.slice(0, 200),
    hashtags: normalizeHashtags(parsed.hashtags, settings.defaultHashtags),
    subtitles: normalizeSubtitles(parsed.subtitles, voiceoverScript),
    provider: "openai",
  };
}

export async function generateScript(
  article: Article & { description?: string | null }
): Promise<GeneratedScriptResult> {
  const settings = await getSettings();
  const hasOpenAI = !!process.env.OPENAI_API_KEY?.trim();

  console.log(
    `[generateScript] articleId=${article.id} title="${article.title.slice(0, 50)}" ` +
      `hasContent=${!!article.content?.trim()} provider=${hasOpenAI ? "openai" : "mock"}`
  );

  if (hasOpenAI) {
    try {
      const result = await generateWithOpenAI(article);
      console.log(`[generateScript] OpenAI success for articleId=${article.id}`);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[generateScript] OpenAI failed for articleId=${article.id}, falling back to mock: ${msg}`
      );
    }
  } else {
    console.log(`[generateScript] No OPENAI_API_KEY — using mock for articleId=${article.id}`);
  }

  const mock = generateMockScript(article, settings.defaultHashtags);
  console.log(`[generateScript] Mock generated for articleId=${article.id}`);
  return mock;
}
