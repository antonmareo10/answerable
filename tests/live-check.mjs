import { chromium } from 'playwright-core';
const b = await chromium.launch();
for (const w of [1280, 320]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 800 } })).newPage();
  await p.goto('https://answerable-accessed.vercel.app/', { waitUntil: 'networkidle' });
  await p.click('#sample-scan');
  await p.waitForFunction(() => /Worksheet ready|could not/.test(document.getElementById('status').textContent), null, { timeout: 90000 });
  console.log(w, await p.textContent('#status'), await p.evaluate(() => document.documentElement.scrollWidth));
}
await b.close();
