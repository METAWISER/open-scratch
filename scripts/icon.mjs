import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
// Rasterize our original SVG for platform packaging. No network or external artwork.
const svg = await readFile("assets/mark.svg", "utf8");
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  async function render(size) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>body{margin:0;background:transparent}svg{width:100vw;height:100vh;display:block}</style>${svg}`,
    );
    return page.screenshot({ omitBackground: true });
  }
  await writeFile("assets/icon.png", await render(1024));
  const sizes = [16, 32, 48, 64, 128, 256];
  const images = [];
  for (const size of sizes) images.push(await render(size));
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, i) => {
    const entry = 6 + i * 16;
    header[entry] = header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(images[i].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += images[i].length;
  });
  await writeFile("assets/icon.ico", Buffer.concat([header, ...images]));
  await writeFile("website/public/favicon.svg", svg);
} finally {
  await browser.close();
}
