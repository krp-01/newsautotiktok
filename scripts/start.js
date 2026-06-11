require("dotenv/config");

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

const { spawn } = require("child_process");
const path = require("path");

const port = process.env.PORT || "3000";
const nextBin = path.join(require.resolve("next/package.json"), "..", "dist", "bin", "next");

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
