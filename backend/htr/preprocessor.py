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
        # Chuyển sang ảnh xám
        if len(image_np.shape) == 3:
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
        else:
            gray = image_np

        # Khử nhiễu nhẹ
        denoised = cv2.fastNlMeansDenoising(gray, h=10)

        # Adaptive Thresholding để tách chữ ra khỏi nền (đặc biệt quan trọng với bút chì/mực mờ)
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )

        # Tìm các đường viền để deskew (xoay thẳng lại vùng chữ)
        coords = np.column_stack(np.where(thresh > 0))
        angle = 0
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

def resize_for_model(image_np, target_size=(32, 128)):
    """Resize ảnh về chuẩn đầu vào của model (thường là H=32, W=tùy biến)"""
    h, w = image_np.shape[:2]
    target_h, target_w = target_size
    
    # Giữ nguyên tỷ lệ hoặc padding
    scale = target_h / h
    new_w = int(w * scale)
    resized = cv2.resize(image_np, (new_w, target_h), interpolation=cv2.INTER_AREA)
    
    # Padding nếu muốn cố định chiều rộng
    if new_w < target_w:
        padding = np.zeros((target_h, target_w - new_w), dtype=np.uint8)
        resized = np.hstack((resized, padding))
    else:
        resized = cv2.resize(resized, (target_w, target_h), interpolation=cv2.INTER_AREA)
        
    return resized
