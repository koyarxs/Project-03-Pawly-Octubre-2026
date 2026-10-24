import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const require = createRequire(import.meta.url);
// Resolve relative to the source tree, independent of the caller's current directory.
const cwd = fileURLToPath(new URL("../../", import.meta.url));
// Each spec and viewport owns its API/schema and real in-memory rate limits.
// Do not weaken production controls or share exhausted counters across projects.
async function runProject(project, spec) {
  const websiteClinicId = randomUUID();
  const backend = spawn(
    process.execPath,
    [fileURLToPath(new URL("./real-backend.mjs", import.meta.url))],
    {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PAWLY_QA_WEBSITE_CLINIC_ID: websiteClinicId,
        PAWLY_QA_PERSONAL_DEMO:
          spec === "personal-demo.real.spec.ts" ? "1" : "0",
      },
    },
  );
  const backendExit = new Promise((resolve) =>
    backend.once("exit", (code) => resolve(code ?? 1)),
  );
  let ready = false;
  let schema;
  let output = "";
  const readiness = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Isolated API startup timed out")),
      60000,
    );
    backend.stdout.on("data", (data) => {
      process.stdout.write(data);
      output += String(data);
      const match = output.match(
        /Browser test API ready: localhost:4001\/pawly; schema=(pawly_frontend_test_[a-f0-9]{32})/,
      );
      if (!ready && match) {
        schema = match[1];
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
        spec,
        "--project",
        project,
      ],
      {
        cwd,
        stdio: "inherit",
        env: {
          ...process.env,
          PAWLY_TEST_SCHEMA: schema,
          PAWLY_QA_API_URL: "http://localhost:4001/api",
          PAWLY_QA_WEBSITE_CLINIC_ID: websiteClinicId,
        },
      },
    );
    code = await new Promise((resolve) =>
      tests.once("exit", (exit) => resolve(exit ?? 1)),
    );
  } catch {
    console.error(`Real ${project} verification failed to start.`);
  } finally {
    if (backend.exitCode === null) backend.stdin.end("stop\n");
    const cleanup = await backendExit;
    if (cleanup !== 0) code = 1;
  }
  return code;
}
const specs = [
  "authentication.real.spec.ts",
  "dashboard.real.spec.ts",
  "clinical.real.spec.ts",
  "appointments.real.spec.ts",
  "booking.real.spec.ts",
  "personal-demo.real.spec.ts",
  "consultations.real.spec.ts",
  "website.real.spec.ts",
  "staff.real.spec.ts",
];
const args = process.argv.slice(2);
const requested = args.filter((arg) => !arg.startsWith("--project="));
const projectArgs = args
  .filter((arg) => arg.startsWith("--project="))
  .map((arg) => arg.slice("--project=".length));
if (projectArgs.some((project) => !["desktop", "mobile"].includes(project)))
  throw new Error("Unknown real test project");
const projects = projectArgs.length
  ? [...new Set(projectArgs)]
  : ["desktop", "mobile"];
if (requested.some((spec) => !specs.includes(spec)))
  throw new Error("Unknown real test spec");
const selected = requested.length
  ? specs.filter((spec) => requested.includes(spec))
  : specs;
outer: for (const project of projects) {
  for (const spec of selected) {
    const code = await runProject(project, spec);
    if (code !== 0) {
      process.exitCode = code;
      break outer;
    }
  }
}
