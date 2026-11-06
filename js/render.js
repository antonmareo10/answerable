// Builds the answerable worksheet as a real form: one fieldset per question, every control labelled.
import { questionsOf } from './parse.js';

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids) e.append(kid);
  return e;
}

const spoken = (text) => text.replace(/____/g, ' (blank) ').replace(/\s+/g, ' ').trim();

function textField(id, label, { multiline = false, describedBy = '' } = {}) {
  const wrap = el('div', { class: 'field' });
  wrap.append(el('label', { for: id }, label));
  const extra = describedBy ? { 'aria-describedby': describedBy } : {};
  wrap.append(multiline ? el('textarea', { id, name: id, rows: 5, ...extra }) : el('input', { id, name: id, type: 'text', autocomplete: 'off', ...extra }));
  return wrap;
}

function questionEl(q) {
  const legend = el('legend', {}, el('span', { class: 'qnum' }, `Question ${q.num}. `), spoken(q.text));
  const box = el('fieldset', { class: 'question', 'data-kind': q.kind, id: `q${q.num}` }, legend);

  if (q.figure) box.append(el('p', { class: 'figure' }, el('strong', {}, 'Picture description: '), q.figure));
  if (q.needsPicture) {
    box.append(el('p', { class: 'needs-picture', role: 'note', id: `q${q.num}-pic` },
      'This question refers to a picture that was not described. A teacher or helper can add a description in step 2.'));
  }

  const opts = q.needsPicture ? { describedBy: `q${q.num}-pic` } : {};
  if (q.needsPicture && (q.kind === 'choice' || q.kind === 'truefalse')) box.setAttribute('aria-describedby', `q${q.num}-pic`);

  if (q.kind === 'choice') {
    const group = el('div', { class: 'choices' });
    for (const o of q.options) {
      const id = `q${q.num}-${o.letter}`;
      group.append(el('div', { class: 'choice' },
        el('input', { type: 'radio', id, name: `q${q.num}`, value: o.letter }),
        el('label', { for: id }, `${o.letter}. ${o.text}`)));
    }
    box.append(group);
  } else if (q.kind === 'truefalse') {
    const group = el('div', { class: 'choices' });
    for (const v of ['True', 'False']) {
      const id = `q${q.num}-${v}`;
      group.append(el('div', { class: 'choice' },
        el('input', { type: 'radio', id, name: `q${q.num}`, value: v }), el('label', { for: id }, v)));
    }
    box.append(group);
  } else if (q.kind === 'multi') {
    q.parts.forEach((p, i) => box.append(textField(`q${q.num}-p${i + 1}`, `${p}`, opts)));
  } else if (q.kind === 'blank') {
    for (let i = 0; i < Math.max(1, q.blanks); i++) {
      box.append(textField(`q${q.num}-b${i + 1}`, q.blanks > 1 ? `Blank ${i + 1}` : 'Your answer (the blank)', opts));
    }
  } else if (q.kind === 'long') {
    box.append(textField(`q${q.num}-a`, 'Your answer', { multiline: true, ...opts }));
  } else {
    box.append(textField(`q${q.num}-a`, 'Your answer', opts));
  }
  return box;
}

export function renderWorksheet(ws, target) {
  target.replaceChildren();
  const head = el('div', { class: 'ws-head' }, el('h3', { id: 'ws-title', tabindex: '-1' }, ws.title || 'Worksheet'));
  if (ws.subtitle) head.append(el('p', { class: 'subtitle' }, ws.subtitle));
  for (const t of ws.intro) head.append(el('p', {}, t));
  target.append(head);

  if (ws.hasName) {
    target.append(el('div', { class: 'name-row' }, textField('ws-name', 'Name'), textField('ws-date', 'Date')));
  }
  if (ws.bank) {
    target.append(el('section', { class: 'bank', 'aria-labelledby': 'bank-h' },
      el('h4', { id: 'bank-h' }, 'Word bank'),
      el('ul', {}, ...ws.bank.map((w) => el('li', {}, w)))));
  }
  ws.sections.forEach((s, si) => {
    const sec = el('section', { class: 'part', 'aria-labelledby': s.heading ? `part-${si}` : false });
    if (s.heading) sec.append(el('h4', { id: `part-${si}` }, s.heading));
    for (const item of s.items) {
      if (item.num) sec.append(questionEl(item));
      else if (item.kind === 'figure') sec.append(el('p', { class: 'figure' }, el('strong', {}, 'Picture description: '), item.text));
      else sec.append(el('p', {}, item.text));
    }
    target.append(sec);
  });
}

export function collectAnswers(ws, form) {
  const val = (id) => (form.querySelector('#' + CSS.escape(id))?.value || '').trim();
  const lines = [ws.title];
  const name = val('ws-name');
  const date = val('ws-date');
  if (name) lines.push(`Name: ${name}`);
  if (date) lines.push(`Date: ${date}`);
  lines.push('');
  for (const q of questionsOf(ws)) {
    let a;
    if (q.kind === 'choice' || q.kind === 'truefalse') {
      const c = form.querySelector(`input[name="q${q.num}"]:checked`);
      a = c ? (q.kind === 'choice' ? `${c.value}. ${q.options.find((o) => o.letter === c.value)?.text}` : c.value) : '';
    } else if (q.kind === 'multi') {
      a = q.parts.map((p, i) => `${p}: ${val(`q${q.num}-p${i + 1}`) || '(no answer)'}`).join('; ');
    } else if (q.kind === 'blank') {
      a = Array.from({ length: Math.max(1, q.blanks) }, (_, i) => val(`q${q.num}-b${i + 1}`)).join(' / ').replace(/^( \/ )+$/, '');
    } else {
      a = val(`q${q.num}-a`);
    }
    lines.push(`${q.num}. ${spoken(q.text)}`);
    lines.push(`   Answer: ${a || '(no answer)'}`);
  }
  return lines.join('\n') + '\n';
}
