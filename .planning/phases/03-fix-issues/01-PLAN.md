---
phase: "03"
plan: "01"
name: "Fix Critical G-CLAUDE Issues"
type: "standard"
---

# Fix Critical G-CLAUDE Issues

## Objective

Xử lý triệt để 6 lỗ hổng nghiêm trọng và tiềm ẩn do G-CLAUDE phát hiện trong hệ thống, bao gồm bảo mật API, độ ổn định của Retry Logic, và xử lý dữ liệu lỗi (Score Parsing, Null Response).

## Context

- Project: ScanExam
- Tech Stack: Django, Ollama, Google GenAI
- Relevant files:
  - `backend/api/views.py`

## Tasks

### Task 1: Gia cố Ollama Client (Issue 1 & 2)

<files>
- backend/api/views.py
</files>

<action>
1. Khởi tạo `ollama.Client(host=os.environ.get("OLLAMA_HOST"))` thay vì gọi global `ollama.generate`.
2. Kiểm tra nếu có `OLLAMA_API_KEY` trong biến môi trường thì cấu hình thêm header `Authorization` (nếu dịch vụ Cloud yêu cầu).
</action>

<verify>
<automated>grep -q "ollama.Client" backend/api/views.py</automated>
</verify>

<done>
Ollama calls được quản lý qua Client object thay vì global module.
</done>

### Task 2: Implement Retry Logic cho AI Calls (Issue 5)

<files>
- backend/api/views.py
</files>

<action>
1. Viết một decorator `@retry_ai_call` (hoặc dùng loop đơn giản) bắt các exception `ConnectionError`, `Timeout` và thử lại tối đa 3 lần với exponential backoff (1s, 2s, 4s).
2. Bao bọc `call_gemini_native` và `call_ollama_vision` bằng logic này.
</action>

<verify>
<automated>grep -q "time.sleep" backend/api/views.py && grep -q "retry" backend/api/views.py</automated>
</verify>

<done>
Nếu AI API bị timeout, hệ thống tự động thử lại thay vì báo lỗi ngay lập tức.
</done>

### Task 3: Xử lý Null & Parse Score (Issue 3 & 4)

<files>
- backend/api/views.py
</files>

<action>
1. Trong `find_best_student_match`, thêm logic bắt `gemini_id` hoặc `gemini_name` là `None`.
2. Tạo hàm `parse_score(raw_score)`: chuyển đổi các định dạng "9,5", "9.5", hoặc text thành số thực (`float`), nếu lỗi trả về `None` để không ghi bậy vào Excel.
3. Tích hợp `parse_score` vào luồng `update_excel_score` hoặc `_internal_save_score`.
</action>

<verify>
<automated>grep -q "parse_score" backend/api/views.py</automated>
</verify>

<done>
Hệ thống không crash khi AI trả về dữ liệu rỗng và điểm số luôn được định dạng đúng số.
</done>

### Task 4: Tối ưu Prompt (Issue 6)

<files>
- backend/api/views.py
</files>

<action>
1. Viết lại Prompt cho Ollama và Gemini: "RETURN ONLY A STRICT JSON OBJECT. DO NOT INCLUDE MARKDOWN TAGS LIKE ```json. USE EXACT KEYS: studentId, studentName, score."
</action>

<verify>
<automated>grep -q "STRICT JSON" backend/api/views.py</automated>
</verify>

<done>
Prompt rõ ràng hơn, giảm thiểu lỗi parse JSON.
</done>

## Success Criteria

- [ ] Ollama Client được cấu hình bảo mật hơn.
- [ ] AI có Retry Logic 3 lần.
- [ ] Hàm `parse_score` hoạt động tốt.
- [ ] JSON từ AI luôn sạch.