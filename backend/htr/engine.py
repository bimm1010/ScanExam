import cv2
import numpy as np
import logging
from .preprocessor import preprocess_for_htr

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
        
        try:
            # Thử khởi tạo PaddleOCR
            from paddleocr import PaddleOCR
            # lang='vi' hoặc 'en' tùy nhu cầu, dùng 'en' cho digits để nhẹ hơn
            self.ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
            self.use_paddle = True
            logger.info("🚀 [HTR-ENGINE] PaddleOCR initialized successfully.")
        except Exception as e:
            logger.warning(f"⚠️ [HTR-ENGINE] PaddleOCR not available, using fallback mode. Error: {str(e)}")
            
        self._initialized = True

    def predict_digit(self, image_np):
        """
        🎯 Nhận diện số từ vùng ảnh cắt.
        Returns: { 'value': str, 'confidence': float }
        """
        if image_np is None:
            return {"value": "", "confidence": 0.0}

        try:
            # 1. Tiền xử lý
            processed = preprocess_for_htr(image_np)

            # 2. Nhận diện
            if self.use_paddle and self.ocr:
                # PaddleOCR nhận ảnh numpy, trả về list các kết quả
                result = self.ocr.ocr(processed, cls=True)
                
                if result and result[0]:
                    # result format: [[ [box], (text, confidence) ], ...]
                    text, confidence = result[0][0][1]
                    # Hậu xử lý cho số: loại bỏ ký tự lạ
                    clean_val = "".join([c for c in text if c.isdigit() or c in ".,"])
                    return {"value": clean_val, "confidence": float(confidence)}
            
            # Fallback logic hoặc Simple Pattern Matching (Mock)
            # Trong thực tế Plan 02 sẽ nạp model ONNX chuyên dụng cho Digits ở đây
            return {"value": "", "confidence": 0.0}
            
        except Exception as e:
            logger.error(f"💥 [HTR-ENGINE] Prediction error: {str(e)}")
            return {"value": "", "confidence": 0.0}

    def detect_and_recognize(self, full_image_np):
        """
        Nhận diện toàn bộ ảnh (áp dụng cho các bài thi có cấu trúc tự do).
        """
        if self.use_paddle and self.ocr:
            return self.ocr.ocr(full_image_np, cls=True)
        return []
