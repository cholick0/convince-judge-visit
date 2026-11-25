import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Gate from competition.yaml: /output/entry.png must be a whole PNG or
// JPEG, at most 1 MiB, and exactly 1024 by 1024 pixels.
const ENTRY_FILENAME = "entry.png";
const OUTPUT_DIR = "/output";
const MAX_BYTES = 1048576;
const EXPECTED_WIDTH = 1024;
const EXPECTED_HEIGHT = 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, ENTRY_FILENAME);
const target = join(OUTPUT_DIR, ENTRY_FILENAME);

function validateEntry(bytes: Buffer): void {
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    throw new Error(`entry.png has unexpected size: ${bytes.length} bytes (max ${MAX_BYTES})`);
  }
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("entry.png is not a PNG file");
  }
  // PNG IHDR chunk: bytes 16..19 are width, 20..23 are height (big-endian).
  if (bytes.length < 24 || bytes.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("entry.png has no IHDR chunk");
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
    throw new Error(`entry.png is ${width}x${height}, expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`);
  }
}

if (!existsSync(source)) {
  throw new Error("entry.png not found next to main.ts");
}

const bytes = readFileSync(source);
validateEntry(bytes);

mkdirSync(OUTPUT_DIR, { recursive: true });
copyFileSync(source, target);

// Byte-level read-back: the file the grader sees must be identical.
const written = readFileSync(target);
if (!written.equals(bytes)) {
  throw new Error("read-back mismatch: /output/entry.png differs from entry.png");
}

console.log(
  `Wrote ${target} (${written.length} bytes, ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}, verified byte-for-byte)`,
);
