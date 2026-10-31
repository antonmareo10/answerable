# Answerable

Answerable turns a scanned or photographed worksheet into a form that a screen reader can read and a keyboard can answer. It is a static site. The text reader (Tesseract.js) runs in the browser, nothing is uploaded, there is no paid API, and after one visit it works with the network off.

Live demo: https://answerable-accessed.vercel.app (checked at desktop width and 320 px, scan sample reads and builds all 8 questions)

I built it solo for AccessED Hacks, in the "Interact" door.

## The barrier

A teacher hands out a worksheet as a scan or a phone photo. For a learner who uses a screen reader, that file is a picture: no text, no headings, nowhere to type. Today that learner waits for a person to read it out and type for them.

## Before and after, on synthetic samples

Two made-up worksheets (a flatbed scan and a harder phone photo of "The Water Cycle", 8 questions) live in `samples/`. Numbers below come from `tests/e2e.mjs` (output in `tests/out/results.json`), run on one Windows PC in headless Chromium.

| | Image alone | Answerable |
|---|---|---|
| Text a screen reader can read | 0 characters, no alt text | the full worksheet |
| Headings to jump between | 0 | 5 (title, word bank, 3 parts) |
| Form controls | 0 | 18, all with labels |
| Questions reachable | 0 of 8 | 8 of 8 |

Keyboard only, no mouse: 4 Tab presses to reach the sample button, then 117 key presses to answer all 8 questions (101 of them typed characters), 11 tab stops, then Enter downloads the answers. The exported file contained every answer.

Reading time on this PC: 1.8 s for the scan, 1.4 s for the photo. The first scan downloads the text reader, 7,207,745 bytes. The page itself is 59,296 bytes on first load, so typing or pasting text needs no OCR download.

## What it can and cannot do

Misreads happen, so step 2 shows the text and lets you fix it. Results on the two samples:

- Structure: all 8 questions, the 3 parts, the word bank, 4 options for questions 4 and 5, and the two arrow labels were found on both images.
- Question types: scan 7 of 8 types exact, photo 6 of 8. The misses are blanks the OCR dropped, which fall back to a plain "Your answer" box, so all 8 stayed answerable.
- Noise from ruled lines: 3 lines removed on the scan, 4 on the photo, and the page lists what it removed.
- Pictures: it cannot read them. A question that mentions a diagram gets a visible warning, and a helper can add `[Figure: description]` under it.

Limits I know about: English only; the parser expects numbered questions with A/B/C options; handwriting is not read; two samples is a tiny test set and I make no claim about other worksheets; the OCR files are only cached for offline use after the first scan on that device; I have not tested with a real screen reader or with learners.

## Accessibility testing, honestly

- axe-core 4.11.0 (WCAG 2.0/2.1/2.2 A and AA plus best-practice rules): 0 violations on the start screen, the worksheet in light and dark mode, the answered worksheet, and at 320 px. It marked color-contrast as "needs review" on some nodes, so I computed the ratios myself (`tests/contrast.mjs`): the lowest pair is 5.33:1 (light input border), text is above 15:1.
- Keyboard walkthrough: automated with Playwright keyboard events (above). Visible focus outline is 3 px solid.
- 320 px width: no horizontal scroll (scrollWidth 320 = clientWidth 320). Screenshots in `docs/screenshots/`.
- Reduced motion: the page has no animation; a reduced-motion rule is also in the CSS.
- Lighthouse 13.6.0 on the live site, headless Chromium, 31 Oct 2026: 100 for performance, accessibility, best practices and SEO, on phone and on desktop (first and largest paint 1.0 s on the phone profile, 0.3 s on desktop; the report files are not committed, run `npx lighthouse` to reproduce).
- Accessibility tree (`tests/a11y-tree.mjs`): the roles, names and live-region announcements Chromium hands to screen readers. 8 named question groups, every control named, a main landmark, and about 6 announcements while reading instead of dozens. This is not a real screen reader.
- Not done: a real screen reader (NVDA, VoiceOver), testing with learners. Semantic HTML (fieldset and legend per question, labelled inputs, status region) is my best attempt at screen reader support, not a verified result.

## Run it

```
npm install
npm start        # http://localhost:4173
npm test         # unit tests + browser tests (needs Playwright Chromium)
```

The site has no build step. `vendor/` is committed so it works from any static host.

## Credits and AI assistance

- Tesseract.js 7.0.0 and tesseract.js-core (Apache 2.0), English model from @tesseract.js-data/eng (best_int), Atkinson Hyperlegible font (SIL OFL), axe-core and playwright-core for tests. Licenses are in `vendor/`.
- Code written with Claude Code (AI assistance). I chose the idea, the scope and the claims, and reviewed the results.
- No pre-existing code was reused. All work is dated inside the event window (see CONTRIBUTIONS.md). Both sample worksheets are synthetic and made by `scripts/make-samples.mjs`.

License: MIT.
