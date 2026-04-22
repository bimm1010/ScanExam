---
phase: "04"
plan: "01"
name: "Local HTR Engine: Core Setup & Digit Focus"
type: "standard"
---

# Local HTR Engine: Core Setup & Digit Focus

## Objective
Thiết lập nền tảng cho hệ thống nhận diện chữ viết tay (HTR) chạy Local. Trọng tâm của Plan 01 là cài đặt môi trường, xử lý ảnh (Preprocessing) và xây dựng bộ nhận diện **Điểm số (Digits)** cơ bản để tích hợp vào luồng xử lý chính.

## Context
- Project: ScanExam
- Tech Stack: Django, PaddleOCR, ONNX Runtime, OpenCV
- Relevant files:
  - `backend/api/views.py`
  - `backend/requirements.txt`

## Tasks

### Task 1: Môi trường & Dependencies
<files>
- backend/requirements.txt
</files>
<action>
1. Thêm các thư viện cần thiết vào `requirements.txt`:
   - `onnxruntime`
   - `opencv-python-headless`
   - `paddleocr`
   - `shapely`
   - `pyclipper`
2. Kiểm tra việc import thử nghiệm để đảm bảo môi trường sẵn sàng.
</action>
<verify>
<automated>pip install -r backend/requirements.txt && python3 -c "import onnxruntime; import cv2; print('HTR Environment OK')"</automated>
</verify>
<done>
Môi trường Python đã sẵn sàng với các thư viện AI cơ bản.
</done>

### Task 2: Module Preprocessing & HTR Engine Core
<files>
- backend/htr/__init__.py
- backend/htr/preprocessor.py
- backend/htr/engine.py
</files>
<action>
1. Tạo thư mục `backend/htr/`.
2. Viết `preprocessor.py`: Hàm `preprocess_for_htr(image)` thực hiện Adaptive Thresholding (Sauvola/Otsu), Deskewing và Resizing về chuẩn 28x28 hoặc 32x32 cho digits.
3. Viết `engine.py`: 
   - Lớp `HTREngine` (Singleton).
   - Hàm `predict_digit(image_crop)`: Hiện tại sử dụng logic đơn giản hoặc gọi OCR sơ bộ (sẽ nâng cấp model ở Plan 02).
</action>
<verify>
<automated>python3 -c "from backend.htr.engine import HTREngine; e = HTREngine(); print('HTR Engine initialized')"</automated>
</verify>
<done>
Khung mã nguồn cho HTR Engine đã được thiết lập.
</done>

### Task 3: Tích hợp Hybrid AI vào Views
<files>
- backend/api/views.py
</files>
<action>
1. Import `HTREngine` vào `views.py`.
2. Trong `background_ai_task`, thêm bước gọi `HTREngine.predict_digit` trước khi gọi Gemini.
3. Thêm logic: Nếu HTR trả về kết quả với confidence > 0.9 thì dùng kết quả đó, ngược lại mới gọi `call_gemini_native`.
</action>
<verify>
<automated>grep -q "HTREngine" backend/api/views.py && grep -q "confidence" backend/api/views.py</automated>
</verify>
<done>
Luồng xử lý bài thi đã tích hợp khả năng nhận diện Local HTR.
</done>

## Success Criteria
- [ ] Cài đặt thành công các thư viện AI.
- [ ] Module `backend/htr` hoạt động ổn định.
- [ ] `views.py` có khả năng fallback thông minh giữa Local HTR và Gemini.

