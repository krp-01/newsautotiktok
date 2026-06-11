import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { estimateSpeechDuration } from "../media/ffprobe";

export interface VoiceoverResult {
  audioPath: string | null;
  skipped: boolean;
  provider?: string;
  reason?: string;
  estimatedDuration?: number;
}

type TtsProvider = "openai" | "elevenlabs";

async function generateWithElevenLabs(text: string, outputPath: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`ElevenLabs API error (${response.status}): ${detail || response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

async function generateWithOpenAITTS(text: string, outputPath: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const voice = process.env.OPENAI_TTS_VOICE || "onyx";

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "tts-1-hd",
      input: text.slice(0, 4096),
      voice,
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI TTS error (${response.status}): ${err}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

function getAvailableProviders(): TtsProvider[] {
  const providers: TtsProvider[] = [];
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.ELEVENLABS_API_KEY) providers.push("elevenlabs");
  return providers;
}

function getProviderOrder(): TtsProvider[] {
  const available = getAvailableProviders();
  if (!available.length) return [];

  const explicit = process.env.TTS_PROVIDER?.toLowerCase();
  const preferred: TtsProvider | null =
    explicit === "openai" || explicit === "elevenlabs" ? explicit : null;

  if (preferred && available.includes(preferred)) {
    return [preferred, ...available.filter((p) => p !== preferred)];
  }

  return available;
}

async function generateWithProvider(
  provider: TtsProvider,
  text: string,
  outputPath: string
): Promise<void> {
  if (provider === "elevenlabs") {
    await generateWithElevenLabs(text, outputPath);
    return;
  }
  await generateWithOpenAITTS(text, outputPath);
}

export async function generateVoiceover(
  script: string,
  articleId: string
): Promise<VoiceoverResult> {
  const audioDir = path.join(process.cwd(), "public", "generated", "audio");
  await mkdir(audioDir, { recursive: true });
  const outputPath = path.join(audioDir, `${articleId}.mp3`);
  const publicPath = `/generated/audio/${articleId}.mp3`;
  const estimatedDuration = estimateSpeechDuration(script);
  const providers = getProviderOrder();

  console.log(
    `[generateVoiceover] articleId=${articleId} providers=${providers.join("→") || "none"} chars=${script.length}`
  );

  if (!providers.length) {
    console.log(`[generateVoiceover] No TTS provider — video will use subtitles only`);
    return {
      audioPath: null,
      skipped: true,
      provider: "none",
      reason: "No TTS API key configured (OPENAI_API_KEY or ELEVENLABS_API_KEY)",
      estimatedDuration,
    };
  }

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      await generateWithProvider(provider, script, outputPath);
      if (errors.length) {
        console.log(
          `[generateVoiceover] Fallback to ${provider} succeeded after: ${errors.join("; ")}`
        );
      }
      console.log(`[generateVoiceover] Success articleId=${articleId} provider=${provider} path=${publicPath}`);
      return { audioPath: publicPath, skipped: false, provider, estimatedDuration };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "TTS generation failed";
      errors.push(`${provider}: ${reason}`);
      console.error(`[generateVoiceover] ${provider} failed articleId=${articleId}: ${reason}`);
    }
  }

  return {
    audioPath: null,
    skipped: true,
    provider: providers[providers.length - 1],
    reason: errors.join("; "),
    estimatedDuration,
  };
}
