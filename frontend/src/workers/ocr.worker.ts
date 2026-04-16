/// <reference lib="webworker" />

/**
 * ocr.worker.ts
 * Web Worker for running Local OCR without blocking the main browser thread.
 * 
 * Optimized for memory management and future WASM integration.
 */

self.addEventListener('message', async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    // Future: Initialize PaddleOCR WASM or ONNX runtime here
    // Example: await ocr.init();
    console.log('[OCR Worker] System ready for processing.');
    self.postMessage({ type: 'INIT_SUCCESS' });
  }

  if (type === 'RECOGNIZE') {
    const { imageBlob, id } = payload;
    console.log(`[OCR Worker] Task [${id}] starting...`);
    
    let imageUrl: string | null = null;
    try {
      // Memory Optimization: Limit the lifetime of the Blob URL
      imageUrl = URL.createObjectURL(imageBlob);
      
      /** 
       * MOCK OCR LOGIC (Future Integration Point)
       * In a real app, you would use: const res = await ocr.recognize(imageUrl);
       */
      await new Promise(r => setTimeout(r, 800)); // Simulate processing latency
      
      const mockResult = {
        text: "Mã SV: 102\nĐiểm: 8.5", 
        confidence: 0.95
      };

      // CRITICAL: Immediately release the blob memory from browser's internal store
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = null;
      
      self.postMessage({ 
        type: 'RECOGNIZE_SUCCESS', 
        payload: { id, result: mockResult.text } 
      });

    } catch (error) {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      console.error(`[OCR Worker] Task [${id}] failed:`, error);
      self.postMessage({ 
        type: 'RECOGNIZE_FAIL', 
        payload: { id, error: String(error) } 
      });
    } finally {
      // Clean up local variables for GC (Garbage Collection)
      console.log(`[OCR Worker] Task [${id}] completed cleanup.`);
    }
  }

  if (type === 'TERMINATE') {
    // Future: Properly shut down WASM runtime to prevent memory leak
    // await ocr.destroy();
    console.log('[OCR Worker] Terminated gracefully.');
    self.close();
  }
});
