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
