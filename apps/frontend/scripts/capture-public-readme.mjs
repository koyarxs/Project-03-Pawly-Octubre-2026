import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const directory = fileURLToPath(new URL("../../../docs/screenshots/", import.meta.url));
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
const captures = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.getByRole("navigation").first().waitFor();
  async function capture(name, selector) {
    const target = selector === "footer" ? page.getByRole("contentinfo").first() : selector ? page.locator(selector).last() : page;
    if (selector) await target.scrollIntoViewIfNeeded();
    if (selector === "#ubicacion") {
      const map = page.frameLocator("#ubicacion iframe");
      await map.getByRole("link", { name: /Términos|Terms/ }).first().waitFor({ state: "visible", timeout: 25000 });
      await map.locator("img").evaluateAll(async (images) => Promise.race([
        Promise.all(images.filter((i) => i.getClientRects().length).map((i) => i.decode().catch(() => {}))),
        new Promise((resolve) => setTimeout(resolve, 7000)),
      ]));
    }
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      await Promise.race([
        Promise.all([...document.images].filter((i) => i.getBoundingClientRect().bottom > 0 && i.getBoundingClientRect().top < innerHeight).map((i) => i.decode().catch(() => {}))),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
    });
    const bytes = await target.screenshot({ animations: "disabled", timeout: 20000, style: "nextjs-portal { display: none !important; }" });
    await sharp(bytes).webp({ quality: 90 }).toFile(path.join(directory, `${name}.webp`));
    captures.push({ file: `${name}.webp`, route: new URL(page.url()).pathname, section: selector || "viewport", width: 1440 });
    console.log(`Captured ${name}`);
  }
  await capture("landing");
  await capture("mascotas", "#companeros");
  await capture("equipo-publico", "#equipo");
  await capture("testimonios", "#testimonios");
  await capture("ubicacion", "#ubicacion");
  await capture("footer", "footer");
  await page.goto("http://localhost:3000/agendar-cita", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Consulta veterinaria general/ }).waitFor();
  await capture("reserva-servicios");
  await writeFile(path.join(directory, "public-captures.json"), JSON.stringify({ capturedAt: new Date().toISOString(), source: "Current local public website; read-only browser capture", captures }, null, 2) + "\n");
} finally {
  await browser.close();
}
