import { cleanOcr } from './clean.js';
import { parseWorksheet } from './parse.js';
import { renderWorksheet, collectAnswers } from './render.js';

const $ = (id) => document.getElementById(id);
const status = $('status');
// The status box sticks to the top of the screen. Its height goes into --status-h, which the page's
// scroll-padding uses so the box never covers the control that has keyboard focus (WCAG 2.2, 2.4.11).
const syncStatusHeight = () => document.documentElement.style.setProperty('--status-h', `${status.offsetHeight}px`);
if ('ResizeObserver' in window) new ResizeObserver(syncStatusHeight).observe(status);
syncStatusHeight();
// Fallback for keyboard focus moves the browser does not scroll for (a tall box already half on screen).
let byPointer = false;
document.addEventListener('pointerdown', () => { byPointer = true; }, true);
document.addEventListener('keydown', () => { byPointer = false; }, true);
document.addEventListener('focusin', (e) => {
  const t = e.target;
  if (byPointer || !(t instanceof HTMLElement) || !(status.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
  const gap = t.getBoundingClientRect().top - (status.getBoundingClientRect().bottom + 8);
  if (gap < 0) window.scrollBy(0, gap);
});
let ws = null;
let imageUrl = null;

function say(msg) { status.textContent = msg; }

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function build({ focus = true } = {}) {
  ws = parseWorksheet($('text').value);
  renderWorksheet(ws, $('worksheet'));
  const nq = $('worksheet').querySelectorAll('fieldset.question').length;
  const nc = $('worksheet').querySelectorAll('input, textarea').length;
  const w = $('warnings');
  w.replaceChildren();
  for (const msg of ws.warnings) {
    const li = document.createElement('li');
    li.textContent = msg;
    w.append(li);
  }
  $('warnings-box').hidden = !ws.warnings.length;
  $('step3').hidden = false;
  $('actions').hidden = !nq;
  say(`Worksheet ready: ${nq} questions, ${nc} answer controls${ws.warnings.length ? `, ${ws.warnings.length} thing${ws.warnings.length > 1 ? 's' : ''} to check` : ''}.`);
  if (focus) $('ws-title').focus();
}

function showRemoved(removed) {
  const list = $('removed-list');
  list.replaceChildren();
  for (const r of removed) {
    const li = document.createElement('li');
    li.textContent = r;
    list.append(li);
  }
  $('removed').hidden = !removed.length;
  $('removed-count').textContent = String(removed.length);
}

async function fromImage(blob, label) {
  say(`Reading ${label}. This runs on your device and can take a little while.`);
  $('step2').hidden = false;
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = URL.createObjectURL(blob);
  $('preview').src = imageUrl;
  $('preview-wrap').hidden = false;
  const t0 = performance.now();
  try {
    const { recognize } = await import('./ocr.js');
    // The status is a polite live region: a screen reader would read every update aloud, so announce
    // the setup once and the progress only at 25 percent steps.
    let prepared = false;
    let lastQuarter = -1;
    const { text, confidence } = await recognize(blob, (m) => {
      if (m.status === 'recognizing text') {
        const quarter = Math.floor(m.progress * 4);
        if (quarter > lastQuarter && quarter < 4) { lastQuarter = quarter; say(`Reading ${label}: ${quarter * 25} percent.`); }
      } else if (m.status && !prepared) { prepared = true; say('Preparing the text reader. The first time this downloads about 7 MB.'); }
    });
    const cleaned = cleanOcr(text);
    $('text').value = cleaned.text;
    showRemoved(cleaned.removed);
    $('ocr-note').textContent = `Reading took ${((performance.now() - t0) / 1000).toFixed(1)} seconds. The reader's own confidence score was ${confidence} out of 100. Check the text below before you trust it.`;
    build({ focus: false });
    $('step2-h').focus();
    say(`${$('status').textContent} Step 2 shows the text I found. Please check it.`);
  } catch (err) {
    say(`I could not read that image (${err.message}). You can still type or paste the worksheet text in step 2.`);
  }
}

async function useSample(file, label) {
  const blob = await (await fetch(`samples/${file}`)).blob();
  fromImage(blob, label);
}

$('file').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) fromImage(f, f.name);
});
$('sample-scan').addEventListener('click', () => useSample('water-cycle-scan.jpg', 'the sample scan'));
$('sample-photo').addEventListener('click', () => useSample('water-cycle-photo.jpg', 'the sample phone photo'));
$('type-own').addEventListener('click', () => { $('step2').hidden = false; $('text').focus(); });
$('build').addEventListener('click', () => build());
$('dl-answers').addEventListener('click', () => download('my-answers.txt', collectAnswers(ws, $('worksheet'))));
$('dl-worksheet').addEventListener('click', () => download('worksheet.txt', $('text').value + '\n'));
$('print').addEventListener('click', () => window.print());
$('worksheet').addEventListener('submit', (e) => e.preventDefault());

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
