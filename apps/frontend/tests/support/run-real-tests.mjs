import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// Resolve relative to the source tree, independent of the caller's current directory.
const cwd = fileURLToPath(new URL("../../", import.meta.url));
const backend = spawn(
  process.execPath,
  [fileURLToPath(new URL("./real-backend.mjs", import.meta.url))],
  { cwd, stdio: ["pipe", "pipe", "pipe"] },
);
const backendExit = new Promise((resolve) =>
  backend.once("exit", (code) => resolve(code ?? 1)),
);
let ready = false;
const readiness = new Promise((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error("Isolated API startup timed out")),
    60000,
  );
  backend.stdout.on("data", (data) => {
    process.stdout.write(data);
    if (String(data).includes("Browser test API ready:")) {
      ready = true;
      clearTimeout(timer);
      resolve();
    }
  });
  backend.stderr.on("data", (data) => process.stderr.write(data));
  backend.once("exit", () => {
    clearTimeout(timer);
    if (!ready) reject(new Error("Isolated API could not start"));
  });
});
let code = 1;
try {
  await readiness;
  const tests = spawn(
    process.execPath,
    [
      require.resolve("@playwright/test/cli"),
      "test",
      "--config",
      "playwright.real.config.ts",
    ],
    { cwd, stdio: "inherit" },
  );
  code = await new Promise((resolve) =>
    tests.once("exit", (exit) => resolve(exit ?? 1)),
  );
} catch {
  console.error("Real authentication verification failed to start.");
} finally {
  if (backend.exitCode === null) backend.stdin.end("stop\n");
  const cleanup = await backendExit;
  if (cleanup !== 0) code = 1;
}
process.exitCode = code;
