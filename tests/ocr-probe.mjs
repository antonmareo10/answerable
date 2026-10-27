// Runs the real in-browser OCR on the two synthetic samples, prints timing and saves the raw text
// to tests/fixtures/ so the cleanup and parser can be tested without a browser.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '4199' }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:4199/tests/ocr-probe.html');
for (const name of ['water-cycle-scan.jpg', 'water-cycle-photo.jpg']) {
  const out = await page.evaluate(async (name) => {
    const { recognize } = await import('/js/ocr.js');
    const blob = await (await fetch('/samples/' + name)).blob();
    const t0 = performance.now();
    const r = await recognize(blob);
    return { ...r, ms: Math.round(performance.now() - t0) };
  }, name);
  console.log(`${name}: ${out.ms} ms, confidence ${out.confidence}`);
  writeFileSync('tests/fixtures/' + name.replace('.jpg', '.ocr.txt'), out.text);
}
await browser.close();
server.kill();
