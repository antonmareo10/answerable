# Contributions

All of this was made during the event window (17 Oct to 20 Nov 2026): the tool on 27 Oct 2026, fixes on 31 Oct, and a polish pass and a new logo on 5 Nov. There was no pre-existing code for this project. The idea, scope and claims are mine; I wrote the code with Claude Code (AI assistance) and reviewed it.

| What | Where | Commit |
|---|---|---|
| In-browser OCR wrapper, vendored Tesseract.js, local server, synthetic sample worksheets (scan and phone photo) | js/ocr.js, vendor/, scripts/, samples/ | 440b665 |
| OCR cleanup (noise lines, blanks, wrapped lines) and plain-text parser | js/clean.js, js/parse.js | 440b665 |
| Accessible form renderer, page, styles, service worker | js/render.js, js/app.js, index.html, css/, sw.js | 440b665 |
| Unit tests, browser tests (axe, keyboard walkthrough, 320 px, network off), contrast check | tests/ | 440b665 |
| Quieter status announcements, favicon, accessibility-tree test, spacing fix (31 Oct) | js/app.js, tests/a11y-tree.mjs | 05ea209, 6d9aca3 |
| Start screen with before/after, logo and app icons, fix for the status box hiding the focused control plus its test, font preload (5 Nov) | index.html, css/, js/app.js, icon*, tests/e2e.mjs | 75cf556 |
| New logo, a question mark whose dot is the answer line: header mark, favicon, app and apple-touch icons, service worker cache v4 (5 Nov) | index.html, css/, icon*, favicon-32.png, apple-touch-icon.png, manifest.webmanifest, sw.js | 6ef30ab |

Third-party code, all unmodified and in vendor/: Tesseract.js 7.0.0, tesseract.js-core, eng model (best_int), Atkinson Hyperlegible.
