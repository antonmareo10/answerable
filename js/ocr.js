// In-browser OCR with Tesseract.js. Everything is loaded from vendor/ on this site:
// no image or text leaves the device, and after the first visit it works offline.
let workerPromise = null;
let progressHandler = () => {};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the text reader (' + src + ').'));
    document.head.append(s);
  });
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const base = new URL('../vendor/', import.meta.url);
      await loadScript(new URL('tesseract/tesseract.min.js', base).href);
      return window.Tesseract.createWorker('eng', 1, {
        workerPath: new URL('tesseract/worker.min.js', base).href,
        corePath: new URL('tesseract/core/', base).href,
        langPath: new URL('lang/', base).href,
        workerBlobURL: false,
        gzip: true,
        logger: (m) => progressHandler(m),
      });
    })();
    workerPromise.catch(() => { workerPromise = null; });
  }
  return workerPromise;
}

// Downscale very large photos (phones give 4000px+) so recognition stays fast on older laptops.
async function toCanvas(file, maxSide = 2200) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas;
}

export async function recognize(file, onProgress = () => {}) {
  progressHandler = onProgress;
  const canvas = await toCanvas(file);
  const worker = await getWorker();
  await worker.setParameters({ preserve_interword_spaces: '1' });
  const { data } = await worker.recognize(canvas);
  progressHandler = () => {};
  return { text: data.text, confidence: Math.round(data.confidence) };
}
