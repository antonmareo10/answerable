// Renders the synthetic worksheet source into two images that stand in for what a learner receives:
// a flatbed scan (samples/water-cycle-scan.jpg) and a phone photo (samples/water-cycle-photo.jpg).
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const src = pathToFileURL(resolve('samples/source/water-cycle.html')).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
for (const [look, quality] of [['scan', 72], ['photo', 62]]) {
  await page.goto(`${src}?look=${look}`);
  await page.locator('#stage').screenshot({ path: `samples/water-cycle-${look}.jpg`, type: 'jpeg', quality });
  console.log('wrote', `samples/water-cycle-${look}.jpg`);
}
await browser.close();
