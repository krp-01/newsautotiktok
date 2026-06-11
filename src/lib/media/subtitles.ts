import type { SubtitleSegment } from "../ai/generateScript";
import { buildSubtitleSegmentsFromVoiceover } from "../ai/generateScript";

export function getVoiceoverText(script: {
  voiceoverScript?: string | null;
  script: string;
  hook?: string;
  description?: string;
}): string {
  if (script.voiceoverScript?.trim()) return script.voiceoverScript.trim();
  if (script.script?.trim()) return script.script.trim();
  return `${script.hook || ""}. ${script.description || ""}`.trim();
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
        text: String(s.text).trim(),
      }))
      .filter((s) => s.text);
  } catch {
    return [];
  }
}

export function syncSubtitlesToDuration(
  subtitles: SubtitleSegment[],
  totalDuration: number
): SubtitleSegment[] {
  if (!subtitles.length) return [];
  const text = subtitles.map((s) => s.text).join(" ");
  return buildSubtitleSegmentsFromVoiceover(text, totalDuration);
}

export function buildSubtitlesFromText(text: string, duration: number): SubtitleSegment[] {
  return buildSubtitleSegmentsFromVoiceover(text, duration);
}

export function subtitleTextForTts(subtitles: SubtitleSegment[]): string {
  return subtitles.map((s) => s.text).join(" ");
}
