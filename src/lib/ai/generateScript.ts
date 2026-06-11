import type { Article } from "@/generated/prisma/client";
import { getSettings } from "../settings";
import { clampVoiceoverLength, isMostlyRomanian } from "./romanian";

export interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

export interface GeneratedScriptResult {
  hook: string;
  headline: string;
  shortSummary: string;
  script: string;
  tiktokTitle: string;
  description: string;
  hashtags: string;
  subtitles: SubtitleSegment[];
  provider: "openai" | "mock";
}

export function getArticleSourceText(article: Article & { description?: string | null }): string {
  if (article.content?.trim()) return article.content.trim();
  if (article.description?.trim()) return article.description.trim();
  if (article.title?.trim()) return article.title.trim();
  return "Informații limitate disponibile din sursa articolului.";
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

export function buildSubtitleSegmentsFromVoiceover(
  voiceoverScript: string,
  totalDuration = 45
): SubtitleSegment[] {
  const words = voiceoverScript.split(/\s+/).filter(Boolean);
  const segments: SubtitleSegment[] = [];
  let cursor = 0;

  for (let i = 0; i < words.length; ) {
    const chunkSize = Math.min(8, Math.max(4, 6 + (i % 3 === 0 ? 1 : 0)));
    const chunkWords = words.slice(i, i + chunkSize);
    i += chunkWords.length;
    segments.push({ start: 0, end: 0, text: chunkWords.join(" ") });
  }

  if (!segments.length) return [];

  const slice = totalDuration / segments.length;
  return segments.map((segment, index) => ({
    text: segment.text,
    start: Math.round(index * slice * 10) / 10,
    end: Math.round(Math.min(totalDuration, (index + 1) * slice) * 10) / 10,
  }));
}

function normalizeSubtitles(value: unknown, voiceoverScript: string): SubtitleSegment[] {
  if (Array.isArray(value) && value.length > 0) {
    const parsed = value
      .filter(
        (s): s is SubtitleSegment =>
          typeof s === "object" &&
          s !== null &&
          typeof (s as SubtitleSegment).text === "string"
      )
      .map((s) => ({
        start: Number(s.start) || 0,
        end: Number(s.end) || 0,
        text: String(s.text).trim(),
      }))
      .filter((s) => s.text);

    if (parsed.length) {
      return buildSubtitleSegmentsFromVoiceover(
        parsed.map((s) => s.text).join(" "),
        45
      );
    }
  }
  return buildSubtitleSegmentsFromVoiceover(voiceoverScript, 45);
}

function buildOutro(): string {
  return "Urmărește-ne pentru actualizări.";
}

function generateMockScript(
  article: Article & { description?: string | null },
  defaultHashtags: string
): GeneratedScriptResult {
  const sourceText = getArticleSourceText(article);
  const headline =
    article.title.length > 90 ? `${article.title.slice(0, 87)}...` : article.title;
  const shortSummary = sourceText.slice(0, 220).trim();
  const body = shortSummary || headline;
  const voiceoverScript = clampVoiceoverLength(
    `${headline}. ${body} ${buildOutro()}`
  );
  const subtitles = buildSubtitleSegmentsFromVoiceover(voiceoverScript, 45);

  return {
    hook: headline,
    headline,
    shortSummary,
    script: voiceoverScript,
    tiktokTitle: headline,
    description: `${shortSummary.slice(0, 180)}\n\n${defaultHashtags}`,
    hashtags: defaultHashtags,
    subtitles,
    provider: "mock",
  };
}

async function generateWithOpenAI(
  article: Article & { description?: string | null },
  attempt = 1
): Promise<GeneratedScriptResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const settings = await getSettings();
  const sourceText = getArticleSourceText(article);

  const prompt = `Generează conținut video de știri TikTok DOAR în limba română pentru articolul de mai jos.
Reguli stricte:
- NU inventa fapte care nu apar în text.
- NU exagera titlul.
- Dacă există doar titlu/descriere, rezumă doar ce există.
- Stil jurnalistic, clar, profesionist, ca un prezentator de știri.
- voiceoverScript trebuie să fie textul exact citit de voice-over (35-55 secunde).
- subtitleSegments trebuie să fie exact fraze din voiceoverScript, 4-8 cuvinte/frază.
- Tot conținutul trebuie în română.

Titlu: ${article.title}
Categorie: ${article.category}
Text sursă: ${sourceText.slice(0, 2500)}

Returnează JSON:
{
  "headline": "titlu scurt jurnalistic",
  "shortSummary": "rezumat scurt factual",
  "voiceoverScript": "text complet voice-over română",
  "subtitleSegments": [{"text":"frază scurtă"}],
  "tiktokDescription": "descriere scurtă",
  "hashtags": "#stiri #romania ..."
}`;

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
            "Ești redactor video pentru o redacție de presă din România. Răspunde doar cu JSON valid, exclusiv în română.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: attempt > 1 ? 0.3 : 0.6,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  const voiceoverScript = clampVoiceoverLength(
    String(parsed.voiceoverScript || parsed.script || "").trim()
  );

  if (!voiceoverScript) {
    throw new Error("OpenAI returned empty voiceoverScript");
  }

  if (!isMostlyRomanian(voiceoverScript)) {
    if (attempt < 2) {
      console.warn(`[generateScript] Non-Romanian output detected, regenerating attempt=${attempt + 1}`);
      return generateWithOpenAI(article, attempt + 1);
    }
    throw new Error("Voiceover script is not in Romanian");
  }

  const headline = String(parsed.headline || parsed.hook || article.title.slice(0, 90)).trim();
  const shortSummary = String(parsed.shortSummary || voiceoverScript.slice(0, 220)).trim();
  const tiktokDescription = String(
    parsed.tiktokDescription || parsed.description || shortSummary
  ).trim();

  const subtitles = normalizeSubtitles(parsed.subtitleSegments || parsed.subtitles, voiceoverScript);

  return {
    hook: headline,
    headline,
    shortSummary,
    script: voiceoverScript,
    tiktokTitle: headline,
    description: `${tiktokDescription}\n\n${normalizeHashtags(parsed.hashtags, settings.defaultHashtags)}`,
    hashtags: normalizeHashtags(parsed.hashtags, settings.defaultHashtags),
    subtitles,
    provider: "openai",
  };
}

export async function generateScript(
  article: Article & { description?: string | null }
): Promise<GeneratedScriptResult> {
  const settings = await getSettings();
  const hasOpenAI = !!process.env.OPENAI_API_KEY?.trim();

  console.log(
    `[generateScript] articleId=${article.id} title="${article.title.slice(0, 50)}" provider=${hasOpenAI ? "openai" : "mock"}`
  );

  if (hasOpenAI) {
    try {
      const result = await generateWithOpenAI(article);
      console.log(`[generateScript] OpenAI success articleId=${article.id}`);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[generateScript] OpenAI failed articleId=${article.id}, fallback mock: ${msg}`);
    }
  }

  return generateMockScript(article, settings.defaultHashtags);
}
