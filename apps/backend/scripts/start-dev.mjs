import { spawn } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  openSync,
  writeFileSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backend = fileURLToPath(new URL("../", import.meta.url));
process.chdir(backend);
const lock = path.join(backend, ".cache", "backend-dev.pid");
mkdirSync(path.dirname(lock), { recursive: true });
let owned = false;
function release() {
  if (owned) {
    try {
      if (readFileSync(lock, "utf8") === String(process.pid)) unlinkSync(lock);
    } catch {
      /* Another process must never be removed. */
    }
    owned = false;
  }
}
process.on("exit", release);

function claim() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(lock, "wx");
      try {
        writeFileSync(fd, String(process.pid));
      } finally {
        closeSync(fd);
      }
      owned = true;
      return true;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const pid = Number(readFileSync(lock, "utf8"));
      if (!Number.isSafeInteger(pid) || pid < 1) return false;
      try {
        process.kill(pid, 0);
        return false;
      } catch (check) {
        if (check.code !== "ESRCH") return false;
      }
      // Only reclaim the stale lock if its owner has not changed.
      if (readFileSync(lock, "utf8") !== String(pid)) return false;
      unlinkSync(lock);
    }
  }
  return false;
}

if (!claim()) {
  console.error(
    "Pawly: ya existe un watcher de desarrollo para este backend. Usa su terminal; no se inicia otra instancia.",
  );
  process.exitCode = 1;
} else {
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT no valido.");
  const probe = net.createServer();
  try {
    await new Promise((resolve, reject) => {
      probe.once("error", reject);
      probe.listen({ port, exclusive: true }, resolve);
    });
    await new Promise((resolve, reject) =>
      probe.close((error) => (error ? reject(error) : resolve())),
    );
    const child = spawn(
      process.execPath,
      ["node_modules/@nestjs/cli/bin/nest.js", "start", "--watch"],
      {
        cwd: backend,
        stdio: "inherit",
        env: process.env,
      },
    );
    child.once("error", () => {
      console.error(
        "Pawly: no se pudo iniciar Nest. Revisa las dependencias del backend.",
      );
      release();
      process.exitCode = 1;
    });
    child.once("exit", (code) => {
      release();
      process.exitCode = code ?? 1;
    });
  } catch (error) {
    console.error(
      error.code === "EADDRINUSE"
        ? `Pawly: el puerto ${port} ya esta en uso. Reutiliza la instancia existente; no se detuvo ningun proceso.`
        : "Pawly: no se pudo comprobar el puerto configurado.",
    );
    release();
    process.exitCode = 1;
  }
}
