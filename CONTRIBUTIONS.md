# Contributions

All of this was made during the event window (17 Oct to 20 Nov 2026), on 27 Oct 2026. There was no pre-existing code for this project. The idea, scope and claims are mine; I wrote the code with Claude Code (AI assistance) and reviewed it.

| What | Where | Commit |
|---|---|---|
| In-browser OCR wrapper, vendored Tesseract.js, local server, synthetic sample worksheets (scan and phone photo) | js/ocr.js, vendor/, scripts/, samples/ | 440b665 |
| OCR cleanup (noise lines, blanks, wrapped lines) and plain-text parser | js/clean.js, js/parse.js | 440b665 |
| Accessible form renderer, page, styles, service worker | js/render.js, js/app.js, index.html, css/, sw.js | 440b665 |
| Unit tests, browser tests (axe, keyboard walkthrough, 320 px, network off), contrast check | tests/ | 440b665 |

Third-party code, all unmodified and in vendor/: Tesseract.js 7.0.0, tesseract.js-core, eng model (best_int), Atkinson Hyperlegible.
