import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

def preprocess_for_htr(image_np):
    """
    🎯 Tiền xử lý ảnh vùng cắt (crop) để tối ưu cho AI nhận diện.
    1. Grayscale
    2. Adaptive Thresholding (Sauvola-like)
    3. Noise reduction
    4. Deskewing (if needed)
    """
    try:
        if image_np is None: return None
        
        # Chuyển sang ảnh xám
        if len(image_np.shape) == 3:
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
        else:
            gray = image_np

        # Khử nhiễu nhẹ
        denoised = cv2.fastNlMeansDenoising(gray, h=10)

        # Adaptive Thresholding để tách chữ ra khỏi nền
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )

        # Tìm các đường viền để deskew (xoay thẳng lại vùng chữ)
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) > 0:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle

            (h, w) = gray.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            return rotated
            
        return gray
    except Exception as e:
        logger.error(f"❌ [PREPROCESSOR] Lỗi: {str(e)}")
        return image_np

def find_score_region(image_np):
    """
    🎯 Tự động tìm vùng có khả năng là điểm số (thường nằm ở góc trên/dưới hoặc trong khung).
    Trả về list các vùng ảnh đã cắt.
    """
    try:
        if image_np is None: return []
        
        # 1. Grayscale + Blur
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY) if len(image_np.shape) == 3 else image_np
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # 2. Canny edge detection
        edged = cv2.Canny(blurred, 50, 200)
        
        # 3. Tìm các vùng đậm đặc (Contours)
        contours, _ = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        candidates = []
        (H, W) = gray.shape[:2]
        
        for c in contours:
            (x, y, w, h) = cv2.boundingRect(c)
            # Lọc các vùng có kích thước giống con số (không quá to, không quá nhỏ)
            # Ví dụ: Diện tích chiếm từ 0.1% đến 5% trang giấy
            aspect_ratio = w / float(h)
            area_ratio = (w * h) / (H * W)
            
            if 0.2 < aspect_ratio < 5.0 and 0.0001 < area_ratio < 0.05:
                # Ưu tiên các vùng ở góc hoặc có độ tương phản cao
                roi = image_np[y:y+h, x:x+w]
                candidates.append({
                    "roi": roi,
                    "rect": (x, y, w, h),
                    "importance": area_ratio
                })
        
        # Sắp xếp theo diện tích (to nhất có thể là điểm tổng)
        candidates = sorted(candidates, key=lambda x: x['importance'], reverse=True)
        return [c['roi'] for c in candidates[:5]] # Lấy top 5 vùng khả nghi
        
    except Exception as e:
        logger.error(f"❌ [PREPROCESSOR] find_score_region error: {str(e)}")
        return []

def auto_prepare_exam_for_ocr(image_np):
    """
    🎯 Pipeline tiền xử lý hoàn toàn mới (V5) dành riêng cho PaddleOCR.
    1. Xoay ảnh về đúng hướng đọc (Portrait ngang -> Xoay 90 CCW).
    2. Nhận diện vùng giấy (loại bỏ mặt bàn).
    3. Cắt ra 2 vùng có khả năng chứa điểm và thông tin: Top (Header) và Bottom Left.
    """
    try:
        if image_np is None: return None, {}
        
        # 1. Xoay 90 độ ngược chiều kim đồng hồ (CCW) vì ảnh chụp từ app ngang máy
        h, w = image_np.shape[:2]
        if h > w:
            rotated = cv2.rotate(image_np, cv2.ROTATE_90_COUNTERCLOCKWISE)
        else:
            rotated = image_np.copy()
            
        rh, rw = rotated.shape[:2]
        gray = cv2.cvtColor(rotated, cv2.COLOR_BGR2GRAY)
        
        # 2. Tìm vùng giấy trắng để loại bỏ nền bàn
        _, mask = cv2.threshold(gray, 160, 255, cv2.THRESH_BINARY)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (50, 50))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        paper_rect = None
        if contours:
            largest = max(contours, key=cv2.contourArea)
            rect = cv2.boundingRect(largest)
            # Nếu vùng giấy lớn hơn 40% diện tích ảnh -> crop
            if rect[2] * rect[3] > rh * rw * 0.4:
                px, py, pw, ph = rect
                rotated = rotated[py:py+ph, px:px+pw]
                rh, rw = rotated.shape[:2]

        # 3. Cắt các vùng quan tâm để tăng tốc độ OCR
        regions = {
            # Header: 35% phía trên (Chứa: Họ tên, Lớp, Trường, STT, Điểm dạng 1)
            "header": rotated[0:int(rh*0.35), :],
            # Bottom Left: 40% góc dưới trái (Chứa: Điểm dạng 2)
            "bottom_left": rotated[int(rh*0.6):, 0:int(rw*0.4)]
        }
        
        return rotated, regions
    except Exception as e:
        logger.error(f"❌ [PREPROCESSOR] auto_prepare error: {str(e)}")
        return image_np, {"header": image_np}
