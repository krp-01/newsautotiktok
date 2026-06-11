import type { SubtitleSegment } from "../ai/generateScript";

export function getVoiceoverText(script: {
  voiceoverScript?: string | null;
  script: string;
  hook: string;
  description?: string;
}): string {
  if (script.voiceoverScript?.trim()) return script.voiceoverScript.trim();
  if (script.script?.trim()) return script.script.trim();
  return `${script.hook}. ${script.description || ""}`.trim();
}

export function parseSubtitles(json: string | null | undefined): SubtitleSegment[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && typeof s.text === "string")
      .map((s) => ({
        start: Number(s.start) || 0,
        end: Number(s.end) || 0,
        text: String(s.text),
      }));
  } catch {
    return [];
  }
}

/** Redistribute subtitle segments evenly across total duration */
export function syncSubtitlesToDuration(
  subtitles: SubtitleSegment[],
  totalDuration: number
): SubtitleSegment[] {
  if (!subtitles.length) return [];

  const chunks = subtitles.map((s) => s.text).filter(Boolean);
  if (!chunks.length) return subtitles;

  const segmentDuration = totalDuration / chunks.length;
  return chunks.map((text, i) => ({
    start: Math.round(i * segmentDuration * 10) / 10,
    end: Math.round(Math.min(totalDuration, (i + 1) * segmentDuration) * 10) / 10,
    text,
  }));
}

export function buildSubtitlesFromText(text: string, duration: number): SubtitleSegment[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  const chunkSize = 6;

  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }

  if (!chunks.length) return [];

  const segmentDuration = duration / chunks.length;
  return chunks.map((chunk, i) => ({
    start: i * segmentDuration,
    end: Math.min(duration, (i + 1) * segmentDuration),
    text: chunk,
  }));
}
