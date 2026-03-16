import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicDir = path.join(root, "public");

const targets = [
  { input: "RTU-Background.png", output: "RTU-Background.webp", quality: 80 },
  { input: "dpo-logo.png", output: "dpo-logo.webp", quality: 90 },
  { input: "dpo-logo-full.png", output: "dpo-logo-full.webp", quality: 90 },
  { input: "rtu-logo.png", output: "rtu-logo.webp", quality: 90 },
];

const fileMtime = async (filePath) => {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtimeMs;
  } catch {
    return 0;
  }
};

const ensureWebp = async ({ input, output, quality }) => {
  const inputPath = path.join(publicDir, input);
  const outputPath = path.join(publicDir, output);

  const [inputMtime, outputMtime] = await Promise.all([
    fileMtime(inputPath),
    fileMtime(outputPath),
  ]);

  if (!inputMtime) {
    console.warn(`[images] Skipped missing source: ${input}`);
    return;
  }

  if (outputMtime >= inputMtime) {
    console.log(`[images] Up to date: ${output}`);
    return;
  }

  await sharp(inputPath)
    .webp({ quality, effort: 4 })
    .toFile(outputPath);

  console.log(`[images] Generated: ${output}`);
};

const run = async () => {
  await Promise.all(targets.map(ensureWebp));
};

run().catch((err) => {
  console.error("[images] Failed to generate modern assets:", err);
  process.exitCode = 1;
});
