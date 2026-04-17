/// <reference lib="webworker" />
import { createWorker } from 'tesseract.js';

/**
 * ocr.worker.ts
 * Web Worker for running Local OCR using Tesseract.js.
 */

let worker: Tesseract.Worker | null = null;

self.addEventListener('message', async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    try {
      console.log('[OCR Worker] Initializing Tesseract...');
      worker = await createWorker('vie+eng', 1, {
        logger: m => console.log(`[OCR Worker Progress] ${m.status}: ${Math.round(m.progress * 100)}%`),
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.0.0/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.0.0/tesseract-core.wasm.js',
      });
      console.log('[OCR Worker] System ready.');
      self.postMessage({ type: 'INIT_SUCCESS' });
    } catch (err) {
      console.error('[OCR Worker] Init failed:', err);
      self.postMessage({ type: 'INIT_FAIL', payload: { error: String(err) } });
    }
  }

  if (type === 'RECOGNIZE') {
    const { imageBlob, id } = payload;
    if (!worker) {
      self.postMessage({ type: 'RECOGNIZE_FAIL', payload: { id, error: 'Worker not initialized' } });
      return;
    }

    console.log(`[OCR Worker] Task [${id}] recognizing...`);
    try {
      const { data: { text, confidence } } = await worker.recognize(imageBlob);
      
      self.postMessage({ 
        type: 'RECOGNIZE_SUCCESS', 
        payload: { id, result: text, confidence } 
      });
    } catch (error) {
      console.error(`[OCR Worker] Task [${id}] failed:`, error);
      self.postMessage({ 
        type: 'RECOGNIZE_FAIL', 
        payload: { id, error: String(error) } 
      });
    }
  }

  if (type === 'TERMINATE') {
    if (worker) {
      await worker.terminate();
      worker = null;
    }
    console.log('[OCR Worker] Terminated.');
    self.close();
  }
});
