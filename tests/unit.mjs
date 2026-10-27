import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanOcr } from '../js/clean.js';
import { parseWorksheet, questionsOf } from '../js/parse.js';

// Ground truth comes from the synthetic source page (samples/source/water-cycle.html).
const EXPECTED = ['blank', 'blank', 'blank', 'choice', 'choice', 'truefalse', 'long', 'multi'];
const read = (n) => readFileSync(new URL('./fixtures/' + n, import.meta.url), 'utf8');

for (const name of ['water-cycle-scan', 'water-cycle-photo']) {
  test(`${name}: cleanup and parse`, () => {
    const { text, removed } = cleanOcr(read(name + '.ocr.txt'));
    const ws = parseWorksheet(text);
    const qs = questionsOf(ws);
    assert.equal(ws.title, 'The Water Cycle');
    assert.equal(ws.bank.length, 5);
    assert.deepEqual(ws.sections.map((s) => s.heading), ['Part A: Fill in the blanks', 'Part B: Choose one answer', 'Part C: Explain']);
    assert.deepEqual(qs.map((q) => q.num), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(qs[3].options.length, 4);
    assert.equal(qs[4].options.length, 4);
    assert.deepEqual(qs[7].parts, ['Arrow 1', 'Arrow 2']);
    assert.ok(qs[7].needsPicture, 'diagram question must be flagged');
    assert.ok(removed.length >= 2, 'noise lines removed');
    assert.ok(!/Sips|SO re|ese ee/.test(text), 'ruled-line noise gone');
    // The scan loses the blank on Q2 and the photo loses blanks on Q1 and Q2,
    // so those fall back to a short answer field, which still works as a text box.
    const wrongKinds = qs.filter((q, i) => q.kind !== EXPECTED[i] && !(i < 2 && q.kind === 'short'));
    assert.deepEqual(wrongKinds.map((q) => q.num), []);
  });
}

test('figure line removes the picture warning', () => {
  const ws = parseWorksheet('T\nPart A: x\n1. Look at the diagram. Name it.\n[Figure: a sun over a lake]');
  assert.equal(ws.warnings.length, 0);
  assert.equal(questionsOf(ws)[0].figure, 'a sun over a lake');
});

test('question number jump is reported', () => {
  const ws = parseWorksheet('T\n1. a\n3. b');
  assert.ok(ws.warnings.some((w) => /jump from 1 to 3/.test(w)));
});

test('real sentences are not dropped as noise', () => {
  const { removed } = cleanOcr('The Water Cycle\n1. It is a big sun.\n2. Is it up?');
  assert.deepEqual(removed, []);
});
