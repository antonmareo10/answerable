import { cleanOcr } from './clean.js';
import { parseWorksheet } from './parse.js';
import { renderWorksheet, collectAnswers } from './render.js';

const $ = (id) => document.getElementById(id);
const status = $('status');
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
    const { text, confidence } = await recognize(blob, (m) => {
      if (m.status === 'recognizing text') say(`Reading ${label}: ${Math.round(m.progress * 100)} percent.`);
      else if (m.status) say(`Preparing the text reader: ${m.status}.`);
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
