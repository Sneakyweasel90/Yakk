// Copies AudioWorklet processor files from @sapphi-red/web-noise-suppressor
// into public/ so they're served as static files at a known URL.
// AudioWorklet.addModule() cannot use bundled JS — it needs a real fetchable URL.
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const pkgDir = resolve(root, "node_modules/@sapphi-red/web-noise-suppressor");
const publicDir = resolve(root, "public");

if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

// Try all known filenames the package has used across versions
const filesToTry = [
  ["workletProcessors.js", "workletProcessors.js"],
  ["workletProcessor.js", "workletProcessors.js"],
  ["dist/workletProcessors.js", "workletProcessors.js"],
  ["rnnoise.wasm", "rnnoise.wasm"],
  ["dist/rnnoise.wasm", "rnnoise.wasm"],
  ["rnnoise_wasm.wasm", "rnnoise.wasm"],
];

for (const [src, dest] of filesToTry) {
  const srcPath = resolve(pkgDir, src);
  if (existsSync(srcPath)) {
    copyFileSync(srcPath, resolve(publicDir, dest));
    console.log(`✓ Copied ${src} → public/${dest}`);
  }
}
