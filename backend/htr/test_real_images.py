#!/usr/bin/env python3
"""
🧪 Test HTR FINAL (100% Offline with PaddleOCR/Mock)
"""

import cv2
import numpy as np
import sys
import os
import json
from pathlib import Path

# Thêm backend vào path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from htr.engine import HTREngine

def main():
    image_dir = Path(__file__).resolve().parent.parent.parent / "imageEX"
    debug_dir = image_dir / "debug" / "v_final"
    debug_dir.mkdir(parents=True, exist_ok=True)
    
    images = sorted(image_dir.glob("*.jpg"))
    if not images:
        print(f"❌ No images in {image_dir}")
        sys.exit(1)
    
    print(f"🔬 V_FINAL: Processing {len(images)} images via HTREngine (PaddleOCR)")
    
    engine = HTREngine()
    
    for img_path in images:
        print(f"\n📷 Processing: {img_path.name}")
        img = cv2.imread(str(img_path))
        if img is None:
            print("   ❌ Cannot load image")
            continue
            
        # Chạy thử extraction (Sẽ trả về mock nếu đang ở Linux không có paddleocr)
        result = engine.extract_exam_info(img)
        
        print("   ✅ Extracted Data:")
        print(json.dumps(result, indent=4, ensure_ascii=False))
        
        # Test xoay & crop để lưu ảnh debug
        from htr.preprocessor import auto_prepare_exam_for_ocr
        rotated, regions = auto_prepare_exam_for_ocr(img)
        
        stem = img_path.stem
        cv2.imwrite(str(debug_dir / f"{stem}_rotated.jpg"), rotated)
        if "header" in regions:
            cv2.imwrite(str(debug_dir / f"{stem}_header.jpg"), regions["header"])
        if "bottom_left" in regions:
            cv2.imwrite(str(debug_dir / f"{stem}_bottom_left.jpg"), regions["bottom_left"])
            
        print(f"   💾 Saved crops to {debug_dir}")

if __name__ == "__main__":
    main()
