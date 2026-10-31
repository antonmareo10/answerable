// Screen-reader view without a screen reader: Chromium's accessibility tree (what NVDA, JAWS and VoiceOver
// are fed) as ARIA snapshots, plus the text the live region announces. This is NOT a test with a real
// screen reader; it checks the roles, names and announcements those tools would receive.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const PORT = '4199';
const BASE = `http://localhost:${PORT}/`;
mkdirSync('tests/out', { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext()).newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    window.__said = [];
    new MutationObserver(() => window.__said.push(document.getElementById('status').textContent.trim()))
      .observe(document.getElementById('status'), { childList: true, characterData: true, subtree: true });
  });
  const start = await page.locator('body').ariaSnapshot();
  await page.click('#sample-scan');
  await page.waitForFunction(() => /Worksheet ready/.test(document.getElementById('status').textContent), null, { timeout: 120000 });
  const said = await page.evaluate(() => [...new Set(window.__said)]);
  const sheet = await page.locator('#worksheet').ariaSnapshot();
  const full = await page.locator('body').ariaSnapshot();
  writeFileSync('tests/out/aria-start.txt', start);
  writeFileSync('tests/out/aria-worksheet.txt', sheet);

  const count = (re) => (sheet.match(re) || []).length;
  const r = {
    landmarks_main: /- main/.test(full),
    live_region_status: /- status/.test(full),
    announcements: said,
    headings_in_worksheet: count(/- '?heading/g),
    groups_with_names: count(/- '?group "/g),
    textboxes: count(/- textbox/g),
    radios: count(/- radio/g),
    radiogroups: count(/- radiogroup/g),
    unnamed_controls: (sheet.match(/- (textbox|radio|checkbox|button)(?! ")(?!:)/g) || []).length,
  };
  assert.ok(said.length <= 10, `live region stays quiet while reading: ${said.length} announcements`);
  assert.ok(r.landmarks_main, 'main landmark in the tree');
  assert.ok(r.live_region_status, 'status live region in the tree');
  assert.ok(said.some((t) => /Worksheet ready/.test(t)), 'progress and result are announced via the live region');
  assert.equal(r.groups_with_names, 8, 'each question is a named group');
  assert.equal(r.unnamed_controls, 0, 'every control has an accessible name');
  assert.ok(r.textboxes >= 8 && r.radios >= 5);
  writeFileSync('tests/out/a11y-tree.json', JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r, null, 2));
  console.log(sheet.split('\n').slice(0, 40).join('\n'));
} finally {
  await browser.close();
  server.kill();
}
