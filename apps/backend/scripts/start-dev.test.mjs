import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const backend = fileURLToPath(new URL("../", import.meta.url));
mkdirSync(path.join(backend, ".cache"), { recursive: true });
function fixture() {
  const root = mkdtempSync(path.join(backend, ".cache", "start-dev-test-"));
  mkdirSync(path.join(root, "scripts"));
  mkdirSync(path.join(root, ".cache"));
  mkdirSync(path.join(root, "node_modules/@nestjs/cli/bin"), {
    recursive: true,
  });
  copyFileSync(
    new URL("start-dev.mjs", import.meta.url),
    path.join(root, "scripts/start-dev.mjs"),
  );
  // Only this isolated fixture substitutes Nest; application code is not changed.
  writeFileSync(
    path.join(root, "node_modules/@nestjs/cli/bin/nest.js"),
    'require("node:fs").writeFileSync(".cache/started", "yes"); setTimeout(() => {}, 1800);',
  );
  return root;
}
function launch(root, port) {
  const child = spawn(
    process.execPath,
    [path.join(root, "scripts/start-dev.mjs")],
    {
      cwd: root,
      env: { ...process.env, PORT: String(port) },
      windowsHide: true,
    },
  );
  let output = "";
  child.stdout.on("data", (data) => {
    output += data;
  });
  child.stderr.on("data", (data) => {
    output += data;
  });
  const result = once(child, "exit").then(([code]) => ({ code, output }));
  return { child, result };
}
async function listen() {
  const server = net.createServer();
  server.listen(0);
  await once(server, "listening");
  return { server, port: server.address().port };
}

test("occupied port refuses startup without touching the existing listener", async () => {
  const { server, port } = await listen();
  try {
    const result = await launch(fixture(), port).result;
    assert.equal(result.code, 1);
    assert.match(result.output, /ya esta en uso/);
    assert.equal(server.listening, true);
  } finally {
    server.close();
  }
});

test("an active watcher lock refuses a second watcher even while its port is free", async () => {
  const root = fixture();
  const { server, port } = await listen();
  await new Promise((resolve) => server.close(resolve));
  writeFileSync(path.join(root, ".cache/backend-dev.pid"), String(process.pid));
  const result = await launch(root, port).result;
  assert.equal(result.code, 1);
  assert.match(result.output, /ya existe un watcher/);
  assert.equal(
    readFileSync(path.join(root, ".cache/backend-dev.pid"), "utf8"),
    String(process.pid),
  );
});

test("first watcher starts once and removes its own lock on exit", async () => {
  const root = fixture();
  const { server, port } = await listen();
  await new Promise((resolve) => server.close(resolve));
  const first = launch(root, port);
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      if (readFileSync(path.join(root, ".cache/started"), "utf8") === "yes")
        break;
    } catch {}
    await delay(25);
  }
  assert.equal(readFileSync(path.join(root, ".cache/started"), "utf8"), "yes");
  const second = await launch(root, port).result;
  assert.equal(second.code, 1);
  assert.equal((await first.result).code, 0);
  assert.throws(() => readFileSync(path.join(root, ".cache/backend-dev.pid")), {
    code: "ENOENT",
  });
});
