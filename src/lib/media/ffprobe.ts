import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function getAudioDurationSeconds(audioPath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audioPath,
      ],
      { timeout: 15000 }
    );
    const duration = parseFloat(stdout.trim());
    return Number.isFinite(duration) ? duration : null;
  } catch {
    return null;
  }
}

export function estimateSpeechDuration(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.min(60, Math.max(30, words * 0.42));
}
