require("dotenv/config");

const { spawn, spawnSync } = require("child_process");
const path = require("path");

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error(
    "[start] DATABASE_URL is not set. Link Railway Postgres and copy DATABASE_URL into service variables."
  );
  process.exit(1);
}

if (databaseUrl.startsWith("file:") || /sqlite/i.test(databaseUrl)) {
  console.error("[start] SQLite is not supported. Use a postgresql:// DATABASE_URL.");
  process.exit(1);
}

function runPrismaDbPush() {
  const prismaCli = path.join(path.dirname(require.resolve("prisma/package.json")), "build", "index.js");

  console.log("[start] Syncing database schema (prisma db push)...");

  const result = spawnSync(process.execPath, [prismaCli, "db", "push"], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(
      "[start] prisma db push failed. Verify DATABASE_URL and that Postgres is reachable from the running service."
    );
    process.exit(result.status ?? 1);
  }
}

function startNextServer() {
  const port = process.env.PORT || "3000";
  const nextBin = path.join(require.resolve("next/package.json"), "..", "dist", "bin", "next");

  console.log(`[start] PATH=${process.env.PATH || "(empty)"}`);
  console.log(`[start] Starting Next.js on 0.0.0.0:${port}`);

  const child = spawn(process.execPath, [nextBin, "start", "-H", "0.0.0.0", "-p", port], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error("[start] Failed to launch Next.js:", error.message);
    process.exit(1);
  });
}

function verifyFfmpegAtStartup() {
  const result = spawnSync("ffmpeg", ["-version"], {
    encoding: "utf8",
    env: process.env,
  });

  if (result.status === 0) {
    const firstLine = (result.stdout || result.stderr || "").split("\n")[0]?.trim();
    console.log(`[start] ffmpeg -version: ${firstLine || "ok"}`);
    return;
  }

  console.error(`[start] ffmpeg not found at startup (PATH=${process.env.PATH || "(empty)"})`);
  console.error("[start] Video generation will fail until ffmpeg is installed (see nixpacks.toml).");
}

runPrismaDbPush();
verifyFfmpegAtStartup();
startNextServer();
