import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const FFMPEG_NOT_FOUND_MESSAGE =
  "FFmpeg not found. On Railway, make sure nixpacks.toml includes ffmpeg.";

export interface RunFfmpegOptions {
  timeout?: number;
  maxBuffer?: number;
  label: string;
}

function formatCommand(args: string[]): string {
  return `ffmpeg ${args.join(" ")}`;
}

export async function verifyFfmpegAvailable(context = "video generation"): Promise<void> {
  console.log(`[ffmpeg] Checking availability for ${context}`);
  console.log(`[ffmpeg] PATH=${process.env.PATH || "(empty)"}`);

  try {
    const { stdout, stderr } = await execFileAsync("ffmpeg", ["-version"], {
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    });
    const output = `${stdout}${stderr}`.trim();
    const firstLine = output.split("\n")[0] || "unknown version";
    console.log(`[ffmpeg] ffmpeg -version: ${firstLine}`);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.error(`[ffmpeg] PATH=${process.env.PATH || "(empty)"}`);
    console.error(`[ffmpeg] verify failed during ${context}: ${err.message}`);

    if (err.code === "ENOENT") {
      throw new Error(FFMPEG_NOT_FOUND_MESSAGE);
    }

    throw new Error(`FFmpeg check failed: ${err.message}`);
  }
}

export async function runFfmpeg(args: string[], options: RunFfmpegOptions): Promise<void> {
  console.log(`[ffmpeg] ${options.label} command: ${formatCommand(args)}`);

  try {
    await execFileAsync("ffmpeg", args, {
      timeout: options.timeout ?? 120000,
      maxBuffer: options.maxBuffer ?? 15 * 1024 * 1024,
    });
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stderr?: string };
    console.error(`[ffmpeg] ${options.label} failed: ${err.message}`);
    if (err.stderr) {
      console.error(`[ffmpeg] ${options.label} stderr: ${String(err.stderr).slice(0, 500)}`);
    }

    if (err.code === "ENOENT") {
      throw new Error(`${FFMPEG_NOT_FOUND_MESSAGE} (failed at ${options.label})`);
    }

    throw new Error(`FFmpeg failed at ${options.label}: ${err.message}`);
  }
}
