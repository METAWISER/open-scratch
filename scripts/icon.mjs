import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
// Original geometric mark, generated deterministically without external artwork.
const size = 256,
  pixels = Buffer.alloc((size * 4 + 1) * size);
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const corner =
      Math.max(0, 34 - Math.min(x, 255 - x)) ** 2 +
      Math.max(0, 34 - Math.min(y, 255 - y)) ** 2;
    const inside = corner <= 34 ** 2;
    const bracket =
      (x >= 52 && x <= 67 && y >= 64 && y <= 192) ||
      (x >= 52 &&
        x <= 95 &&
        ((y >= 64 && y <= 79) || (y >= 177 && y <= 192))) ||
      (x >= 188 && x <= 203 && y >= 64 && y <= 192) ||
      (x >= 160 &&
        x <= 203 &&
        ((y >= 64 && y <= 79) || (y >= 177 && y <= 192)));
    const slash =
      y >= 74 && y <= 182 && Math.abs(x - (154 - (y - 74) * 0.48)) <= 8;
    const color = bracket || slash ? [20, 41, 31] : [159, 232, 204];
    const i = y * (size * 4 + 1) + 1 + x * 4;
    pixels[i] = color[0];
    pixels[i + 1] = color[1];
    pixels[i + 2] = color[2];
    pixels[i + 3] = inside ? 255 : 0;
  }
function crc(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c ^= byte;
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const kind = Buffer.from(name),
    length = Buffer.alloc(4),
    sum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  sum.writeUInt32BE(crc(Buffer.concat([kind, data])));
  return Buffer.concat([length, kind, data, sum]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size);
ihdr.writeUInt32BE(size, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(pixels)),
  chunk("IEND", Buffer.alloc(0)),
]);
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png.length, 14);
ico.writeUInt32LE(22, 18);
await mkdir("assets", { recursive: true });
await writeFile("assets/icon.png", png);
await writeFile("assets/icon.ico", Buffer.concat([ico, png]));
