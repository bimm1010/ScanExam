---
phase: "01"
plan: "01"
name: "AI-First OCR & RapidFuzz Matching"
type: "standard"
---

# AI-First OCR & RapidFuzz Matching

## Objective

Tối ưu hóa độ chính xác nhận diện học sinh bằng cơ chế AI-First. Backend sẽ sử dụng RapidFuzz để đối chiếu (khớp mờ) kết quả thô từ Gemini với danh sách lớp thực tế (Roster), đảm bảo `studentId` luôn chính xác 100% trước khi ghi vào file Excel.

## Context

- Project: ScanExam
- Tech Stack: Django, RapidFuzz, Gemini 2.5 Flash
- Relevant files:
  - `backend/api/views.py`

## Tasks

### Task 1: Triển khai Fuzzy Matching tại Backend

<files>
- backend/api/views.py
</files>

<action>
1. Tạo hàm `find_best_student_match(gemini_id, gemini_name, roster_data)` sử dụng `rapidfuzz`. (File đã import sẵn `process` và `fuzz`).
2. Hàm này nhận vào ID và Tên do Gemini đọc được, kết hợp đối chiếu với mảng `roster_data` (chứa các dict `{"id": "...", "name": "..."}`).
3. Chuẩn hoá chuỗi (dùng hàm `normalize_string` có sẵn) trước khi so sánh.
4. Ưu tiên khớp ID. Nếu không có ID hoặc khớp thấp, chuyển sang khớp Tên.
5. Cập nhật `process_test_paper` và `background_ai_task` để gọi hàm này sau khi có kết quả từ `call_gemini_native`, từ đó chỉnh sửa lại `res['studentId']` cho chuẩn xác.
6. Bổ sung `isFuzzyMatch` (boolean) và `fuzzyScore` (number) vào kết quả JSON trả về.
</action>

<verify>
<automated>grep -q "find_best_student_match" backend/api/views.py</automated>
</verify>

<done>
Backend nhận diện chính xác `studentId` từ Roster kể cả khi Gemini đọc sai hoặc thiếu vài ký tự.
</done>

## Success Criteria

- [ ] Hàm fuzzy matching được tích hợp thành công.
- [ ] Nếu Gemini đọc sai 1-2 ký tự, hệ thống vẫn map đúng ID học sinh trong Excel.
- [ ] Dữ liệu điểm được ghi vào đúng dòng của học sinh đó.