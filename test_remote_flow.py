import urllib.request
import urllib.error
import json
import base64
import time

API_BASE = "http://10.10.10.172:5173"
SESSION_ID = "test_session_999"

def post_json(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'),
                                 headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode('utf-8')), res.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode('utf-8')), e.code
    except Exception as e:
        return {"error": str(e)}, 500

def get_json(url):
    try:
        with urllib.request.urlopen(url) as res:
            return json.loads(res.read().decode('utf-8')), res.status
    except Exception as e:
        return {"error": str(e)}, 500

print("🚀 Bắt đầu giả lập luồng Mobile Scan...\n")

# 1. Test Health
print("1. Kiểm tra Health Check...")
res, status = get_json(f"{API_BASE}/api/health/")
print(f"Status: {status}, Response: {res}\n")

# 2. Tạo một base64 image thật nhỏ để test
minimal_jpeg = base64.b64encode(
    bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x01, 0xA2, 0x00, 0xFF,
        0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0xD2, 0x93, 0x11,
        0x00, 0xFF, 0xD9
    ])
).decode('utf-8')
img_base64 = f"data:image/jpeg;base64,{minimal_jpeg}"

print("2. Set cấu hình Session (giả lập Desktop đã chọn Excel)")
res, status = post_json(f"{API_BASE}/api/process-test-paper/", {
    "expected_subject": "Toán",
    "excel_filename": "test_roster.xlsx",
    "roster": [{"Mã SV": "123", "Tên": "Nguyễn Văn A"}]
})
print(f"Status: {status}\n")

print("3. Push ảnh từ Mobile (Mobile Scan) vào Session")
res, status = post_json(f"{API_BASE}/api/scan-upload/{SESSION_ID}/", {"image_base64": img_base64})
print(f"Status: {status}, Response: {res}\n")

print("4. Chờ 3 giây cho AI ThreadPoolExecutor chạy ngầm...")
for i in range(3):
    time.sleep(1)
    print("...", end="", flush=True)
print("\n")

print("5. Polling kết quả (Desktop hỏi xem ảnh đã lên chưa)")
res, status = get_json(f"{API_BASE}/api/scan-poll/{SESSION_ID}/")
print(f"Status: {status}, Response: {res}\n")

print("Hoàn thành!")
