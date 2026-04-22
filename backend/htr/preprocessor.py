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

def resize_for_model(image_np, target_size=(32, 128)):
    """Resize ảnh về chuẩn đầu vào của model (thường là H=32, W=tùy biến)"""
    if image_np is None: return None
    h, w = image_np.shape[:2]
    target_h, target_w = target_size
    
    scale = target_h / h
    new_w = int(w * scale)
    resized = cv2.resize(image_np, (new_w, target_h), interpolation=cv2.INTER_AREA)
    
    if new_w < target_w:
        padding = np.zeros((target_h, target_w - new_w), dtype=np.uint8)
        resized = np.hstack((resized, padding))
    else:
        resized = cv2.resize(resized, (target_w, target_h), interpolation=cv2.INTER_AREA)
        
    return resized
