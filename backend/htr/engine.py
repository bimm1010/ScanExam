import cv2
import numpy as np
import logging
import os
from .preprocessor import preprocess_for_htr, find_score_region

logger = logging.getLogger(__name__)

class HTREngine:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(HTREngine, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        self.ocr = None
        self.use_paddle = False
        self.use_onnx = False
        self.onnx_session = None
        
        # 1. Thử khởi tạo PaddleOCR (Ưu tiên nếu có)
        try:
            from paddleocr import PaddleOCR
            self.ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
            self.use_paddle = True
            logger.info("🚀 [HTR-ENGINE] PaddleOCR initialized.")
        except Exception:
            logger.warning("⚠️ [HTR-ENGINE] PaddleOCR not available, looking for ONNX fallback...")

        # 2. Thử khởi tạo ONNX Runtime (Dành cho Python 3.14)
        if not self.use_paddle:
            try:
                import onnxruntime as ort
                # Đường dẫn model dự kiến (sẽ được thêm ở Plan 02)
                model_path = os.path.join(os.path.dirname(__file__), "models", "digit_rec.onnx")
                if os.path.exists(model_path):
                    self.onnx_session = ort.InferenceSession(model_path)
                    self.use_onnx = True
                    logger.info(f"✅ [HTR-ENGINE] ONNX model loaded from {model_path}")
                else:
                    logger.info("ℹ️ [HTR-ENGINE] No local ONNX model found. Will rely on Gemini or Simple Mock.")
            except Exception as e:
                logger.error(f"❌ [HTR-ENGINE] ONNX initialization failed: {str(e)}")
            
        self._initialized = True

    def predict_digit(self, image_np):
        """
        🎯 Nhận diện số từ vùng ảnh.
        Nếu là ảnh to, nó sẽ tự động tìm vùng điểm số trước.
        """
        if image_np is None:
            return {"value": "", "confidence": 0.0}

        try:
            (h, w) = image_np.shape[:2]
            
            # Nếu ảnh quá to (ví dụ > 500px), coi như là ảnh toàn bài thi
            if h > 500 or w > 500:
                logger.info("🔍 [HTR-ENGINE] Large image detected. Searching for score regions...")
                score_rois = find_score_region(image_np)
                
                best_val = ""
                best_conf = 0.0
                
                for roi in score_rois:
                    res = self._do_predict(roi)
                    if res['confidence'] > best_conf:
                        best_val = res['value']
                        best_conf = res['confidence']
                
                return {"value": best_val, "confidence": best_conf}
            else:
                return self._do_predict(image_np)
                
        except Exception as e:
            logger.error(f"💥 [HTR-ENGINE] Prediction error: {str(e)}")
            return {"value": "", "confidence": 0.0}

    def _do_predict(self, roi):
        """Lõi nhận diện trên một vùng ảnh đã cắt nhỏ."""
        # 1. Tiền xử lý vùng cắt
        processed = preprocess_for_htr(roi)
        
        # 2. Nhận diện bằng PaddleOCR
        if self.use_paddle and self.ocr:
            result = self.ocr.ocr(processed, cls=True)
            if result and result[0]:
                text, confidence = result[0][0][1]
                clean_val = "".join([c for c in text if c.isdigit() or c in ".,"])
                return {"value": clean_val, "confidence": float(confidence)}
        
        # 3. Nhận diện bằng ONNX (Placeholder cho Plan 02)
        if self.use_onnx and self.onnx_session:
            # Logic thực tế cho ONNX sẽ được viết ở Plan 02
            # Hiện tại trả về mock có logic để test
            return {"value": "ONNX_MOCK", "confidence": 0.5}

        return {"value": "", "confidence": 0.0}

    def detect_and_recognize(self, full_image_np):
        if self.use_paddle and self.ocr:
            return self.ocr.ocr(full_image_np, cls=True)
        return []
