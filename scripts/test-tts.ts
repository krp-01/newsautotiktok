import "dotenv/config";
import { generateVoiceover } from "../src/lib/tts/generateVoiceover";

async function main() {
  console.log("TTS_PROVIDER:", process.env.TTS_PROVIDER);
  console.log("ELEVENLABS_API_KEY set:", !!process.env.ELEVENLABS_API_KEY);
  console.log("OPENAI_API_KEY set:", !!process.env.OPENAI_API_KEY);

  const result = await generateVoiceover(
    "Aceasta este o stire de test pentru voice over in stilul presei.",
    "test-tts"
  );
  console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
