// End-to-end checks in headless Chromium: real OCR on the synthetic samples, keyboard-only walkthrough,
// axe-core accessibility scan, 320px layout, network-off run, and the numbers quoted in the README.
// Writes tests/out/results.json and screenshots into docs/screenshots/.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';

const PORT = '4198';
const BASE = `http://localhost:${PORT}/`;
mkdirSync('tests/out', { recursive: true });
mkdirSync('docs/screenshots', { recursive: true });
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const results = { date: new Date().toISOString(), checks: {} };
const axeSrc = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const KINDS = ['blank', 'blank', 'blank', 'choice', 'choice', 'truefalse', 'long', 'multi'];

async function axe(page, label) {
  await page.evaluate(axeSrc);
  const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
  const out = { violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), passes: r.passes.length, incomplete: r.incomplete.map((v) => v.id) };
  results.checks[`axe: ${label}`] = out;
  return out;
}

async function ready(page, which) {
  const t0 = Date.now();
  await page.click(which === 'scan' ? '#sample-scan' : '#sample-photo');
  await page.waitForFunction(() => /Worksheet ready/.test(document.getElementById('status').textContent) || /could not read/.test(document.getElementById('status').textContent), null, { timeout: 120000 });
  return Date.now() - t0;
}

async function counts(page) {
  return page.evaluate(() => {
    const w = document.getElementById('worksheet');
    return {
      questions: w.querySelectorAll('fieldset.question').length,
      controls: w.querySelectorAll('input, textarea').length,
      unlabelled: [...w.querySelectorAll('input, textarea')].filter((c) => !(c.labels && c.labels.length)).length,
      headings: w.querySelectorAll('h3, h4').length,
      kinds: [...w.querySelectorAll('fieldset.question')].map((f) => f.dataset.kind),
      status: document.getElementById('status').textContent,
    };
  });
}

const browser = await chromium.launch({ args: ['--lang=en-US'] }); // English file-picker text in the screenshots
try {
  // ---- Before: the image alone, as a screen reader meets it
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.setContent('<!doctype html><html lang="en"><title>x</title><img src="data:image/jpeg;base64,' + readFileSync('samples/water-cycle-scan.jpg').toString('base64') + '">');
    results.before_image_only = await page.evaluate(() => ({
      readable_text_chars: document.body.innerText.trim().length,
      form_controls: document.querySelectorAll('input,textarea,select,button').length,
      headings: document.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
      img_alt: document.querySelector('img').getAttribute('alt'),
    }));
    await ctx.close();
  }

  // ---- Cold load, network accounting, scan flow, a11y
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  const bytes = { initial: 0, ocr: 0 };
  let phase = 'initial';
  page.on('response', async (r) => { try { const b = (await r.body()).length; bytes[phase] += b; } catch {} });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  results.page_load_bytes_without_ocr = bytes.initial;
  await axe(page, 'start screen');
  await page.screenshot({ path: 'docs/screenshots/01-start-desktop.png' });

  phase = 'ocr';
  const scanMs = await ready(page, 'scan');
  results.scan = { ...(await counts(page)), wall_ms_incl_first_load: scanMs, ocr_download_bytes: bytes.ocr, ocr_note: await page.textContent('#ocr-note'), removed_lines: await page.textContent('#removed-count') };
  assert.equal(results.scan.questions, 8);
  assert.equal(results.scan.unlabelled, 0);
  results.scan.kinds_exact = results.scan.kinds.filter((k, i) => k === KINDS[i]).length;
  results.scan.kinds_usable = results.scan.kinds.filter((k, i) => k === KINDS[i] || (i < 2 && k === 'short')).length;
  results.scan.raw_ocr_lines = (await page.evaluate(() => document.getElementById('removed-list').children.length));
  await axe(page, 'scan result, light');
  await page.screenshot({ path: 'docs/screenshots/02-text-check-desktop.png', fullPage: false });
  await page.locator('#step3').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/screenshots/03-worksheet-desktop.png', fullPage: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  await axe(page, 'scan result, dark');
  await page.emulateMedia({ colorScheme: 'light' });

  // ---- Keyboard-only walkthrough on the second sample (fresh load, no mouse)
  const kb = await ctx.newPage();
  await kb.goto(BASE, { waitUntil: 'networkidle' });
  let keys = 0;
  const press = async (k) => { keys++; await kb.keyboard.press(k); };
  const typeText = async (t) => { keys += t.length; await kb.keyboard.type(t); };
  const active = () => kb.evaluate(() => { const a = document.activeElement; return { id: a.id, tag: a.tagName, type: a.type || '', name: a.name || '', value: a.value || '' }; });
  for (let i = 0; i < 12 && (await active()).id !== 'sample-photo'; i++) await press('Tab');
  assert.equal((await active()).id, 'sample-photo', 'sample button reachable by Tab');
  const tabsToSample = keys;
  await press('Enter');
  await kb.waitForFunction(() => /Worksheet ready/.test(document.getElementById('status').textContent), null, { timeout: 120000 });
  results.photo = { ...(await counts(kb)), ocr_note: await kb.textContent('#ocr-note') };
  results.photo.kinds_exact = results.photo.kinds.filter((k, i) => k === KINDS[i]).length;
  results.photo.kinds_usable = results.photo.kinds.filter((k, i) => k === KINDS[i] || (i < 2 && k === 'short')).length;
  await kb.focus('#build');
  await press('Enter'); // rebuild from the edited text, moves focus to the worksheet title
  assert.equal((await active()).id, 'ws-title');
  const keysBeforeWalk = keys;
  const fill = { 'q4': 1, 'q5': 2 };
  const texts = { 'ws-name': 'Sam Example', 'ws-date': '2026-10-27', 'q1-a': 'evaporation', 'q2-a': 'condensation', 'q3-b1': 'precipitation', 'q7-a': 'More rain in autumn.', 'q8-p1': 'evaporation', 'q8-p2': 'precipitation' };
  let seen = 0;
  for (let i = 0; i < 80; i++) {
    await press('Tab');
    const a = await active();
    if (a.id === 'dl-answers') break;
    seen++;
    if (a.type === 'radio') {
      if (a.name === 'q6') await press('Space');
      else { for (let d = 0; d < fill[a.name]; d++) await press('ArrowDown'); }
    } else if (texts[a.id]) await typeText(texts[a.id]);
    else assert.fail('unexpected control ' + a.id);
  }
  results.keyboard = { tab_to_load_sample: tabsToSample, keys_to_answer_whole_worksheet: keys - keysBeforeWalk, of_which_typed_characters: Object.values(texts).join('').length, stops: seen, mouse_used: false };
  const [dl] = await Promise.all([kb.waitForEvent('download'), press('Enter')]);
  const answersPath = 'tests/out/my-answers.txt';
  await dl.saveAs(answersPath);
  const answers = readFileSync(answersPath, 'utf8');
  for (const must of ['Answer: evaporation', 'Answer: B. Oceans', 'Answer: C. The Sun', 'Answer: True', 'More rain in autumn.', 'Arrow 1: evaporation; Arrow 2: precipitation']) assert.ok(answers.includes(must), 'answer export has: ' + must);
  results.keyboard.export_ok = true;
  await kb.screenshot({ path: 'docs/screenshots/04-answered-desktop.png', fullPage: true });
  await axe(kb, 'answered worksheet');

  // Focus visibility: outline on a focused control is not "none"
  results.keyboard.focus_outline = await kb.evaluate(() => { document.getElementById('dl-answers').focus(); const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth}`; });

  // Focus not obscured (WCAG 2.2, 2.4.11): walking back with Shift+Tab, the sticky status box must not
  // cover any part of the focused control. Before the fix it hid the question 1 answer box almost entirely.
  let covered = 0;
  for (let i = 0; i < 20; i++) {
    await kb.keyboard.press('Shift+Tab');
    covered += await kb.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return 0;
      const r = a.getBoundingClientRect();
      const s = document.getElementById('status').getBoundingClientRect();
      return Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top) > 0 ? 1 : 0;
    });
  }
  results.keyboard.backward_stops_covered_by_status = covered;
  assert.equal(covered, 0, 'sticky status box covers a focused control');

  // ---- 320px, no horizontal scroll
  const small = await browser.newContext({ viewport: { width: 320, height: 640 }, serviceWorkers: 'block' });
  const sp = await small.newPage();
  await sp.goto(BASE, { waitUntil: 'networkidle' });
  await sp.screenshot({ path: 'docs/screenshots/05-start-320.png' });
  await ready(sp, 'scan');
  results.width_320 = await sp.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  assert.ok(results.width_320.scrollWidth <= results.width_320.clientWidth, 'no horizontal scroll at 320px');
  await sp.locator('#step3').scrollIntoViewIfNeeded();
  await sp.screenshot({ path: 'docs/screenshots/06-worksheet-320.png', fullPage: true });
  await axe(sp, 'scan result, 320px');
  await small.close();

  // ---- Reduced motion: no animations or transitions declared
  results.reduced_motion = await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => { const s = getComputedStyle(e); return (s.animationName !== 'none') || parseFloat(s.transitionDuration) > 0; }).length);

  // ---- Network off: after one visit, reload with the network cut and run the full flow again
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });
  await ctx.setOffline(true);
  await page.reload();
  const offMs = await ready(page, 'photo');
  results.offline = { ...(await counts(page)), wall_ms: offMs };
  assert.equal(results.offline.questions, 8, 'offline run builds the worksheet');
  await ctx.setOffline(false);
  results.js_errors = errors;
} finally {
  await browser.close();
  server.kill();
}

const size = (p) => statSync(p).size;
results.sizes_bytes = {
  app_shell_js_css_html: ['index.html', 'css/style.css', 'js/app.js', 'js/clean.js', 'js/parse.js', 'js/render.js'].reduce((n, p) => n + size(p), 0),
  fonts: size('vendor/fonts/atkinson-hyperlegible-400.woff2') + size('vendor/fonts/atkinson-hyperlegible-700.woff2'),
  ocr_engine_files_downloaded_on_first_scan: results.scan.ocr_download_bytes,
  sample_scan_jpg: size('samples/water-cycle-scan.jpg'),
};
writeFileSync('tests/out/results.json', JSON.stringify(results, null, 2));
const bad = Object.entries(results.checks).flatMap(([k, v]) => v.violations.map((x) => `${k}: ${x.id} (${x.impact}) x${x.nodes}`));
console.log(JSON.stringify(results, null, 2));
if (bad.length) { console.error('AXE VIOLATIONS\n' + bad.join('\n')); process.exitCode = 1; }
