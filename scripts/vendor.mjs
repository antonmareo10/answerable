// Copies the third-party files the app needs at runtime from node_modules into vendor/.
// The app has no build step: vendor/ is committed so the site works from any static host.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const files = [
  ['tesseract.js/dist/tesseract.min.js', 'tesseract/tesseract.min.js'],
  ['tesseract.js/dist/worker.min.js', 'tesseract/worker.min.js'],
  ['tesseract.js/LICENSE.md', 'tesseract/LICENSE-tesseract.js.md'],
  ['tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract/core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract/core/tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract/core/tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/LICENSE', 'tesseract/core/LICENSE-tesseract.js-core'],
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
  ['@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2', 'fonts/atkinson-hyperlegible-400.woff2'],
  ['@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2', 'fonts/atkinson-hyperlegible-700.woff2'],
  ['@fontsource/atkinson-hyperlegible/LICENSE', 'fonts/LICENSE-atkinson-hyperlegible.txt'],
];

for (const [from, to] of files) {
  const dest = join('vendor', to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join('node_modules', from), dest);
  console.log('copied', to);
}
