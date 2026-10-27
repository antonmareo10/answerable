// Turns raw OCR output into plain text a person can read and fix by hand.
// Pure functions, no DOM, so they run in the browser and in the Node tests.

const STRUCTURAL = /^(Part\s+[A-Z]\b|\d{1,2}[.)]\s|[A-E][.)]\s|Word bank\b|Name:|\[(Figure|Picture|Image|Diagram)\b)/i;
const LABEL_LINE = /^[A-Za-z][\w ]{0,30}?\d*:\s*(____)?$/;

export function isStructural(line) {
  return STRUCTURAL.test(line) || LABEL_LINE.test(line);
}

// Lines produced by ruled answer lines, diagram edges or handwriting-like texture.
export function looksLikeNoise(line) {
  const t = line.trim();
  if (!t) return true;
  if (isStructural(t)) return false;
  if (/[.?!]$/.test(t) && /[A-Za-z]{4,}/.test(t)) return false;
  const squeezed = t.replace(/\s+/g, '');
  const letters = (squeezed.match(/[A-Za-z]/g) || []).length;
  if (letters / squeezed.length < 0.5) return true;
  const tokens = t.split(/\s+/);
  const short = tokens.filter((w) => w.replace(/[^A-Za-z]/g, '').length <= 3).length;
  const hasRealWord = tokens.some((w) => w.replace(/[^A-Za-z]/g, '').length >= 5);
  return !hasRealWord && short / tokens.length >= 0.6;
}

function tidyLine(line) {
  let l = line.replace(/\t/g, ' ').replace(/\s+$/, '');
  for (let i = 0; i < 3; i++) l = l.replace(/^(?:[^\w\s]{1,2}|[A-Za-z0-9])\s{3,}(?=\S)/, ''); // stray marks before a label
  l = l.replace(/\s{6,}[^\s]{1,2}$/, ' ____'); // blank followed by a stray mark
  l = l.replace(/(:)\s{6,}(?=\S)/g, '$1 ____ '); // "Name:      Date:"
  l = l.replace(/(?:_\s?){2,}_?/g, '____'); // underscores of any length
  l = l.replace(/\s{2,}/g, ' ').trim();
  if (/^Name:/i.test(l)) l = 'Name: ____ Date: ____';
  return l;
}

export function cleanOcr(raw) {
  const removed = [];
  const kept = [];
  for (const line of String(raw).replace(/\r/g, '').split('\n')) {
    if (!line.trim()) continue;
    const l = tidyLine(line);
    if (!l) continue;
    if (looksLikeNoise(l)) removed.push(l);
    else kept.push(l);
  }
  // Join wrapped question lines ("... This is" + "called ____").
  const out = [];
  let open = false;
  for (const l of kept) {
    if (open && !isStructural(l) && out.length) {
      out[out.length - 1] += ' ' + l;
      open = !/(?:[.?!]|____)$/.test(l);
      continue;
    }
    out.push(l);
    open = /^\d{1,2}[.)]\s/.test(l) && !/(?:[.?!:]|____)$/.test(l);
  }
  return { text: out.join('\n'), removed };
}
