/// <reference lib="webworker" />

// ocr.worker.ts
// Web Worker for running Local OCR without blocking the main browser thread

// TODO: Import PaddleOCR WASM/ONNX here in the future
// import * as ocr from '@paddlejs-models/ocr';

self.addEventListener('message', async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    // Initialize the OCR model here
    console.log('[OCR Worker] Initialization started...');
    // await ocr.init();
    console.log('[OCR Worker] Ready.');
    self.postMessage({ type: 'INIT_SUCCESS' });
  }

  if (type === 'RECOGNIZE') {
    const { imageBlob, id } = payload;
    console.log('[OCR Worker] Processing image', id);
    
    try {
      // Create Object URL from Blob
      const imageUrl = URL.createObjectURL(imageBlob);
      
      // MOCK OCR RESULT FOR NOW
      // In reality: const res = await ocr.recognize(imageUrl);
      // Simulate processing time
      await new Promise(r => setTimeout(r, 1500));
      
      const mockResult = {
        text: "Mã SV: 102\nĐiểm: 8.5", 
        confidence: 0.95
      };

      URL.revokeObjectURL(imageUrl);
      
      self.postMessage({ 
        type: 'RECOGNIZE_SUCCESS', 
        payload: { id, result: mockResult.text } 
      });
    } catch (error) {
      console.error('[OCR Worker] Error:', error);
      self.postMessage({ 
        type: 'RECOGNIZE_FAIL', 
        payload: { id, error: String(error) } 
      });
    }
  }
});
