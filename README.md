# 🚀 ScanExam - Ứng dụng Chấm điểm Thông minh Triple-AI (≧◡≦)

ScanExam là một ứng dụng web hiện đại giúp giáo viên tự động hóa việc chấm điểm bài thi từ ảnh chụp. Ứng dụng sử dụng sức mạnh của **Gemini 2.5 Flash** để nhận diện học sinh và điểm số, sau đó tự động cập nhật trực tiếp vào file Excel danh sách lớp.

---

## ✨ Tính năng nổi bật

- **Quét Ảnh Hàng Loạt (Batch Processing):** Gửi nhiều ảnh cùng lúc để tiết kiệm quota API và tăng tốc độ xử lý.
- **Tự động Khớp Danh sách (Student Matching):** Sử dụng Fuzzy Matching (khớp mờ) để nhận diện tên học sinh dù chữ viết tay không quá rõ ràng.
- **Ghi dữ liệu Excel trực tiếp:** Tự động tìm đúng sheet môn học và ghi điểm vào cột tương ứng.
- **Cơ chế Flush Thông minh:** Cho phép xử lý ngay lập tức kể cả khi chỉ có 1 ảnh, đảm bảo không mất dữ liệu khi nhấn tải file.
- **Giao diện Rose/Slate Modern:** Thiết kế Liquid Glass sang trọng, hỗ trợ tốt trên cả máy tính và điện thoại.

---

## 🛠️ Hướng dẫn Cài đặt

### 1. Yêu cầu hệ thống
- **Node.js** (Phiên bản 18 trở lên)
- **Python** (Phiên bản 3.9 trở lên)

### 2. Cài đặt Backend (Django)
```bash
cd backend
# Tạo môi trường ảo
python -m venv venv
source venv/bin/activate  # Trên Windows dùng: venv\Scripts\activate

# Cài đặt thư viện
pip install -r requirements.txt

# Cấu hình biến môi trường
# Tạo file .env và thêm key Gemini của bạn:
# GEMINI_API_KEY=your_api_key_here
```

### 3. Cài đặt Frontend (React + Vite)
```bash
cd frontend
npm install

# Tạo file .env và thêm key Gemini (cho một số tính năng client-side nếu cần):
# VITE_GEMINI_API_KEY=your_api_key_here

npm run dev
```

---

## 🚀 Hướng dẫn Sử dụng

1.  **Tải lên Roster:** Chọn file Excel danh sách học sinh của bạn (.xlsx).
2.  **Cấu hình Cột:** AI sẽ tự động gợi ý các cột STT, Họ Tên, Điểm... Bạn chỉ cần xác nhận.
3.  **Quét Ảnh:** Sử dụng camera điện thoại hoặc upload ảnh bài thi đã chụp.
4.  **Tải file Excel:** Sau khi quét xong, nhấn nút **"TẢI FILE EXCEL"**. Hệ thống sẽ tự động tổng hợp kết quả AI và trả về file Excel đã được điền điểm.

---

## 🛡️ Liên minh Triple-AI

Dự án này được phát triển bởi sự phối hợp của:
- **Antigravity**: Chịu trách nhiệm thực thi logic và gõ code.
- **Siêu Reviewer**: Đảm bảo code luôn sạch, tối ưu và bảo mật.
- **Gemini CLI**: Cố vấn chiến lược và kiểm tra chéo kiến trúc.

---

## 📝 Giấy phép
Bản quyền thuộc về **bimm1010**. Vui lòng liên hệ tác giả để biết thêm chi tiết.
