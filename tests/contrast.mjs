// WCAG contrast ratios for the colour pairs the stylesheet uses (axe cannot decide some of them automatically).
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const light = { bg: '#fbfaf7', fg: '#1a1a1a', muted: '#4a4a4a', card: '#ffffff', line: '#6b6b6b', accent: '#0b4f8a', accentFg: '#ffffff', focus: '#b30059', warnBg: '#fff3cd', warnLine: '#7a5a00' };
const dark = { bg: '#121212', fg: '#f2f2f2', muted: '#c4c4c4', card: '#1c1c1c', line: '#9a9a9a', accent: '#8cc4ff', accentFg: '#0a0a0a', focus: '#ffb3d9', warnBg: '#3a3000', warnLine: '#ffd666' };
let worst = 99;
for (const [name, t] of [['light', light], ['dark', dark]]) {
  const pairs = [['text on page', t.fg, t.bg], ['text on card', t.fg, t.card], ['muted on card', t.muted, t.card], ['muted on page', t.muted, t.bg], ['link on card', t.accent, t.card], ['button text', t.accentFg, t.accent], ['focus ring on card', t.focus, t.card], ['focus ring on page', t.focus, t.bg], ['input border on card', t.line, t.card], ['text on warning', t.fg, t.warnBg]];
  for (const [label, a, b] of pairs) { const r = ratio(a, b); worst = Math.min(worst, r); console.log(name.padEnd(5), label.padEnd(22), r.toFixed(2)); }
}
console.log('lowest ratio', worst.toFixed(2));
