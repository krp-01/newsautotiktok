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
  return Math.min(60, Math.max(35, words * 0.42));
}

export async function getImageDimensions(
  imagePath: string
): Promise<{ width: number; height: number } | null> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=p=0:s=x",
        imagePath,
      ],
      { timeout: 15000 }
    );
    const [width, height] = stdout.trim().split("x").map(Number);
    if (!width || !height) return null;
    return { width, height };
  } catch {
    return null;
  }
}

export async function getVideoDurationSeconds(videoPath: string): Promise<number | null> {
  return getAudioDurationSeconds(videoPath);
}
