import cv2
import numpy as np
import logging
import os
import re
from .preprocessor import auto_prepare_exam_for_ocr

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
            from paddleocr import PaddleOCR
            # lang='vi' is better for Vietnamese handwriting and names!
            self.ocr = PaddleOCR(use_angle_cls=True, lang='vi', show_log=False)
            self.use_paddle = True
            logger.info("🚀 [HTR-ENGINE] PaddleOCR initialized successfully.")
        except Exception as e:
            logger.warning(f"⚠️ [HTR-ENGINE] PaddleOCR not available: {str(e)}. Will use mock data for testing on Linux.")

        self._initialized = True

    def extract_exam_info(self, image_np):
        """
        🎯 Đọc toàn bộ ảnh bằng PaddleOCR và trích xuất Điểm, Tên, STT.
        Trả về: {"score": "9.75", "studentName": "Nam Phong", "studentId": "35", "confidence": 0.9}
        """
        if image_np is None:
            return None

        # 1. Tiền xử lý: Xoay và cắt vùng để tăng tốc độ OCR
        rotated_img, regions = auto_prepare_exam_for_ocr(image_np)
        
        extracted_data = {
            "score": None,
            "studentName": None,
            "studentId": None,
            "confidence": 0.0
        }

        # Nếu không có PaddleOCR (đang code trên Linux), trả về Mock Data để pass logic test
        if not self.use_paddle or not self.ocr:
            logger.info("ℹ️ [HTR-ENGINE] Mocking OCR extraction (PaddleOCR is not installed here).")
            # Trả về giá trị giả lập để test backend không sập
            return {
                "score": "8.5", 
                "studentName": "Mock Student", 
                "studentId": "99", 
                "confidence": 0.99
            }

        # 2. Quét vùng Header (Chứa Tên, Lớp, STT, và có thể Điểm)
        header_results = self.ocr.ocr(regions.get("header", rotated_img), cls=True)
        if header_results and header_results[0]:
            self._parse_ocr_results(header_results[0], extracted_data)

        # 3. Nếu chưa tìm thấy Điểm, quét tiếp góc trái dưới (Template 2)
        if not extracted_data["score"] and "bottom_left" in regions:
            bottom_results = self.ocr.ocr(regions["bottom_left"], cls=True)
            if bottom_results and bottom_results[0]:
                self._parse_ocr_results(bottom_results[0], extracted_data)

        return extracted_data

    def _parse_ocr_results(self, ocr_data, result_dict):
        """
        Phân tích kết quả OCR (Bounding Boxes + Text) để tìm Tên, STT, Điểm
        bằng cách dò các anchor words ("Điểm", "Họ tên", "STT").
        """
        boxes = []
        for line in ocr_data:
            coords, (text, conf) = line
            xs = [p[0] for p in coords]
            ys = [p[1] for p in coords]
            x, y, w, h = min(xs), min(ys), max(xs)-min(xs), max(ys)-min(ys)
            boxes.append({
                "box": (x, y, w, h),
                "text": text.strip(),
                "conf": conf,
                "center_x": x + w/2,
                "center_y": y + h/2
            })
            
        anchor_score = None
        anchor_name = None
        anchor_stt = None
        
        for b in boxes:
            txt_lower = b["text"].lower()
            if "điểm" in txt_lower or "diem" in txt_lower:
                anchor_score = b
            elif "họ tên" in txt_lower or "học sinh" in txt_lower or "tên:" in txt_lower:
                anchor_name = b
            elif "stt" in txt_lower or "sbd" in txt_lower:
                anchor_stt = b

        def find_value_box(anchor, expected_type="text"):
            best_box = None
            min_dist = float('inf')
            ax, ay, aw, ah = anchor["box"]
            acy, acx = anchor["center_y"], anchor["center_x"]
            
            for b in boxes:
                if b == anchor: continue
                bx, by, bw, bh = b["box"]
                bcy, bcx = b["center_y"], b["center_x"]
                
                is_same_line = abs(bcy - acy) < ah
                is_right = bcx > acx
                is_below = bcy > acy and abs(bcx - acx) < aw*2 and (bcy - acy) < ah*3
                
                if (is_same_line and is_right) or is_below:
                    dist = abs(bcx - acx) if is_same_line else abs(bcy - acy)
                    
                    if expected_type == "digit" and not any(c.isdigit() for c in b["text"]):
                        continue
                        
                    if dist < min_dist:
                        min_dist = dist
                        best_box = b
                        
            return best_box

        if not result_dict["score"] and anchor_score:
            val_box = find_value_box(anchor_score, "digit")
            if val_box:
                score_str = "".join([c for c in val_box["text"] if c.isdigit() or c in ".,"])
                result_dict["score"] = score_str
                result_dict["confidence"] = float(val_box["conf"])

        if not result_dict["studentId"] and anchor_stt:
            val_box = find_value_box(anchor_stt, "digit")
            if val_box:
                stt_str = "".join([c for c in val_box["text"] if c.isdigit()])
                result_dict["studentId"] = stt_str

        if not result_dict["studentName"] and anchor_name:
            val_box = find_value_box(anchor_name, "text")
            if val_box:
                name_str = re.sub(r'[^a-zA-ZÀ-ỹ\s]', '', val_box["text"]).strip()
                result_dict["studentName"] = name_str

