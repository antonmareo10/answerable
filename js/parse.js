// Parses the editable plain-text worksheet into a model the page can render as a real form.
// Text conventions: "Part A: ..." headings, "1. question", "A. option", "____" blanks,
// "Word bank: a, b, c", "Label:" lines for multi-part answers, "[Figure: description]" for pictures.

const PART = /^Part\s+([A-Z])\s*[:.\-]?\s*(.*)$/i;
const QUESTION = /^(\d{1,2})[.)]\s+(.*)$/;
const OPTION = /^([A-E])[.)]\s+(.*)$/;
const BANK = /^Word bank\s*:\s*(.*)$/i;
const FIGURE = /^\[(?:Figure|Picture|Image|Diagram)\s*:\s*(.*?)\]?$/i;
const SUBLABEL = /^([A-Za-z][\w ]{0,30}?\d*):\s*(?:____)?$/;
const LONG_START = /^(describe|explain|why|discuss|write|how|give|compare|outline|suggest|evaluate)\b/i;
const NEEDS_PICTURE = /\b(diagram|figure|picture|graph|chart|map|image|photo)\b/i;

export function parseWorksheet(text) {
  const ws = { title: '', subtitle: '', hasName: false, intro: [], bank: null, sections: [], warnings: [] };
  let section = { heading: null, items: [] };
  let q = null;
  const lines = String(text).replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  const flush = () => { if (q) { section.items.push(finish(q, section)); q = null; } };

  for (const line of lines) {
    let m;
    if (!ws.title) { ws.title = line; continue; }
    if ((m = line.match(PART))) {
      flush();
      if (section.heading || section.items.length) ws.sections.push(section);
      section = { heading: `Part ${m[1].toUpperCase()}${m[2] ? ': ' + m[2] : ''}`, items: [] };
    } else if ((m = line.match(QUESTION))) {
      flush();
      q = { num: Number(m[1]), text: m[2], options: [], parts: [], figure: '' };
    } else if (q && (m = line.match(OPTION))) {
      q.options.push({ letter: m[1].toUpperCase(), text: m[2] });
    } else if ((m = line.match(FIGURE))) {
      if (q) q.figure = m[1]; else section.items.push({ kind: 'figure', text: m[1] });
    } else if (/^Name:/i.test(line)) {
      ws.hasName = true;
    } else if ((m = line.match(BANK))) {
      ws.bank = m[1].split(/[,;]/).map((w) => w.trim()).filter(Boolean);
    } else if (q && (m = line.match(SUBLABEL))) {
      q.parts.push(m[1].trim());
    } else if (q) {
      q.text += ' ' + line; // continuation the cleanup did not join
    } else if (!section.heading && !section.items.length && !ws.subtitle && !ws.intro.length) {
      ws.subtitle = line;
    } else if (!section.heading) {
      ws.intro.push(line);
    } else {
      section.items.push({ kind: 'note', text: line });
    }
  }
  flush();
  if (section.heading || section.items.length) ws.sections.push(section);

  const qs = questionsOf(ws);
  for (const x of qs) {
    if (x.needsPicture) ws.warnings.push(`Question ${x.num} refers to a picture. I cannot read pictures. Add a line like [Figure: what it shows] under the question.`);
  }
  if (!qs.length) ws.warnings.push('I found no numbered questions. Check that each question starts with a number and a full stop, like "1. ".');
  qs.forEach((x, i) => {
    if (i && x.num !== qs[i - 1].num + 1) ws.warnings.push(`Question numbers jump from ${qs[i - 1].num} to ${x.num}. A question may be missing or misnumbered.`);
  });
  return ws;
}

function finish(q, section) {
  const blanks = (q.text.match(/____/g) || []).length;
  let kind;
  if (q.options.length >= 2) kind = 'choice';
  else if (/true or false/i.test(q.text)) kind = 'truefalse';
  else if (q.parts.length) kind = 'multi';
  else if (blanks) kind = 'blank';
  else if (LONG_START.test(q.text) || /explain|write|describe/i.test(section.heading || '')) kind = 'long';
  else kind = 'short';
  return { ...q, kind, blanks, needsPicture: NEEDS_PICTURE.test(q.text) && !q.figure };
}

export function questionsOf(ws) {
  return ws.sections.flatMap((s) => s.items.filter((i) => i.num));
}
