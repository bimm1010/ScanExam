---
phase: "04"
plan: "01"
subsystem: "HTR Engine"
tags: ["AI", "Local", "HTR", "Backend"]
decisions:
  - "Sử dụng PaddleOCR cho Detection và VietOCR/TrOCR cho Recognition."
  - "Triển khai chiến thuật Hybrid AI (Local first, Gemini fallback)."
metrics:
  - "Duration: 20m"
  - "Completed Date: 2026-04-22"
---

# Phase 04 Plan 01: Local HTR Engine Setup Summary

## One-liner
Thiết lập nền tảng Hybrid AI cho phép nhận diện điểm số offline với PaddleOCR và logic fallback thông minh.

## Key Changes
- [NEW] `backend/htr/`: Module nhận diện chữ viết tay.
- [NEW] `backend/htr/preprocessor.py`: Tiền xử lý ảnh (Thresholding, Deskew).
- [NEW] `backend/htr/engine.py`: Lõi HTR Engine với Singleton pattern.
- [MODIFY] `backend/api/views.py`: Tích hợp Hybrid AI logic vào background task.

## Deviations from Plan
- Đã thêm `scikit-image` và `paddlepaddle` vào `requirements.txt` để hỗ trợ đầy đủ cho PaddleOCR.

## Next Steps
- Triển khai Plan 02: Fine-tuning & ONNX Export cho Digit Recognizer.
