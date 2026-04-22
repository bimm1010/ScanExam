import requests
import json
import os
import base64

API_BASE = "http://localhost:8000"
IMAGE_PATH = "backend/media/scanned_images/scan_test.png"

def test_backend_connectivity():
    print("🚀 [TEST] Bắt đầu kiểm tra thông luồng Backend...")
    
    # 1. Health Check
    try:
        res = requests.get(f"{API_BASE}/api/health/")
        if res.status_code == 200:
            print(f"✅ Health Check: PASS ({res.json()})")
        else:
            print(f"❌ Health Check: FAIL ({res.status_code})")
            return False
    except Exception as e:
        print(f"💥 Health Check: ERROR {str(e)}")
        return False

    # 2. Test Gemini API Flow với ảnh thật
    if not os.path.exists(IMAGE_PATH):
        print(f"⚠️ Cảnh báo: Không tìm thấy ảnh mẫu {IMAGE_PATH}, bỏ qua bước test AI.")
        return True

    print(f"📡 Đang thử gửi ảnh {IMAGE_PATH} lên Gemini API...")
    try:
        with open(IMAGE_PATH, "rb") as f:
            image_bytes = f.read()
            img_b64 = f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode('utf-8')}"

        payload = {
            "image_data_list": [img_b64],
            "expected_subject": "Toán",
            "excel_filename": "test_roster.xlsx",
            "roster": [{"id": "001", "name": "Nguyen Van A"}]
        }
        
        res = requests.post(f"{API_BASE}/api/process-test-paper/", json=payload)
        
        if res.status_code == 200:
            print(f"✅ Gemini API Flow: PASS")
            print(f"📦 Kết quả trả về: {res.json()}")
            return True
        else:
            print(f"❌ Gemini API Flow: FAIL ({res.status_code})")
            print(f"📝 Response: {res.text}")
            return False
    except Exception as e:
        print(f"💥 Gemini API Flow: ERROR {str(e)}")
        return False

if __name__ == "__main__":
    if test_backend_connectivity():
        print("\n🏆 TỔNG KẾT: BACKEND ĐÃ THÔNG! 🚀")
    else:
        print("\n💀 TỔNG KẾT: BACKEND CÓ VẤN ĐỀ! 🛠️")
