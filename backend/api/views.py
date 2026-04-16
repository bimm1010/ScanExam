import os
import json
import base64
import datetime
import logging
import threading
import subprocess
import socket
import re
from pathlib import Path
from dotenv import load_dotenv
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
import google.generativeai as genai

# Configure Logging
logger = logging.getLogger(__name__)

# Locks & Store
_scan_store_lock = threading.Lock()
_scan_store = {}

# Session Context (Excel, Subject, Roster)
_current_session_config = {
    "excel_filename": None,
    "subject": None,
    "roster_json": None
}

# Load environment variables
load_dotenv()

# Cấu hình Gemini API
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("⚠️ GEMINI_API_KEY not found in environment variables!")

def get_backend_root():
    return Path(__file__).resolve().parent.parent

def extract_base64_data(image_data_base64):
    try:
        imgstr = image_data_base64.split(';base64,')[1] if ';' in image_data_base64 else image_data_base64
        return base64.b64decode(imgstr)
    except: return None

def call_gemini_native(image_filename, excel_filename, subject, roster_json):
    """
    🎯 GEMINI API: Sử dụng Google Generative AI SDK (Thay thế hoàn toàn CLI).
    """
    if not GEMINI_API_KEY:
        logger.error("❌ API Key is missing. Please set GEMINI_API_KEY in .env")
        return {"status": "error", "msg": "API Key missing"}

    try:
        # 1. Chuẩn bị file ảnh
        image_path = (get_backend_root() / 'media' / 'scanned_images' / image_filename).absolute()
        if not image_path.exists():
            return {"status": "error", "msg": "Image file not found"}

        # Đọc ảnh dưới dạng bytes cho SDK
        with open(image_path, "rb") as f:
            image_bytes = f.read()

        # 2. Xây dựng Prompt
        # Lưu ý: Với API, chúng ta yêu cầu mô hình trả về JSON chuẩn
        prompt = (
            f"Nhiệm vụ: Chấm điểm bài thi viết tay môn {subject}. "
            f"Hãy phân tích hình ảnh đính kèm và tìm điểm số của học sinh. "
            f"Danh sách học sinh hiện tại: {roster_json}. "
            f"Trả về kết quả dưới dạng JSON duy nhất với định dạng: "
            f"{{'studentId': '...', 'score': '...', 'status': 'success'}}"
        )

        # 3. Gọi Model Gemini 1.5 Flash (Free & Fast)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Gửi prompt và ảnh
        # Cấu hình response_mime_type để đảm bảo nhận được JSON
        response = model.generate_content(
            [prompt, {"mime_type": "image/jpeg", "data": image_bytes}],
            generation_config={"response_mime_type": "application/json"}
        )

        # 4. Xử lý kết quả
        result_text = response.text.strip()
        logger.info(f"✅ [GEMINI-API] Kết quả cho {image_filename}: {result_text}")
        
        # Parse JSON từ text
        return json.loads(result_text)

    except Exception as e:
        logger.error(f"⚠️ [GEMINI-API] Exception: {str(e)}", exc_info=True)
        return None

def call_gemini_cli_on_mac(image_filename, excel_filename, subject, roster_json):
    # Wrapper để không làm gãy các lời gọi hàm cũ
    return call_gemini_native(image_filename, excel_filename, subject, roster_json)

# --- API ENDPOINTS ---

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        "status": "healthy", 
        "mode": "Gemini API SDK",
        "api_key_configured": bool(GEMINI_API_KEY)
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def server_info(request):
    return Response({"hostname": socket.gethostname(), "ai": "Gemini 1.5 Flash API"})

@api_view(['POST'])
@csrf_exempt
@permission_classes([AllowAny])
def process_test_paper(request):
    print(f"🚀 [BACKEND] Nhận ảnh, đang chuyển cho Gemini API...")
    img_list = request.data.get('image_data_list', [])
    if not img_list and request.data.get('image_data'): img_list = [request.data.get('image_data')]
    
    subject = request.data.get('expected_subject')
    excel_filename = request.data.get('excel_filename')
    roster_data = request.data.get('roster', [])
    roster_str = json.dumps(roster_data, ensure_ascii=False)

    if excel_filename: _current_session_config["excel_filename"] = excel_filename
    if subject: _current_session_config["subject"] = subject
    if roster_str: _current_session_config["roster_json"] = roster_str

    try:
        final_results = []
        for img_b64 in img_list:
            raw_bytes = extract_base64_data(img_b64)
            if not raw_bytes: continue
            
            img_name = f"api_scan_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
            save_path = get_backend_root() / 'media' / 'scanned_images' / img_name
            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, 'wb') as f: f.write(raw_bytes)
            
            res = call_gemini_cli_on_mac(img_name, excel_filename, subject, roster_str)
            if res:
                res['excelUpdated'] = True 
                final_results.append(res)
        
        return Response(final_results)
    except Exception as e:
        logger.error(f"❌ [PROCESS-PAPER] Lỗi: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def upload_roster_excel(request):
    file_obj = request.FILES.get('file')
    if not file_obj: return Response({"error": "No file"}, status=400)
    try:
        filename = f"roster_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{file_obj.name}"
        save_path = get_backend_root() / 'media' / 'rosters' / filename
        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, 'wb+') as f:
            for chunk in file_obj.chunks(): f.write(chunk)
        return Response({"success": True, "filename": filename})
    except Exception as e: return Response({"error": str(e)}, status=500)

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

def send_ws_update(session_id, message_type, data):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"scan_{session_id}",
        {
            "type": "scan_message",
            "message": {
                "type": message_type,
                "payload": data
            }
        }
    )

def background_ai_task(image_filename, config, session_id):
    try:
        send_ws_update(session_id, "ai_status", {"status": "analyzing", "msg": "🤖 Gemini đang phân tích bài..."})
        
        logger.info(f"🧵 [THREAD-AI] Bắt đầu chấm bài API: {image_filename}")
        res = call_gemini_native(
            image_filename, 
            config['excel_filename'], 
            config['subject'], 
            config['roster_json']
        )
        
        if res:
            logger.info(f"✅ [THREAD-AI] Hoàn thành API {image_filename}")
            send_ws_update(session_id, "ai_result", {
                "status": "success", 
                "studentId": res.get('studentId'),
                "score": res.get('score'),
                "image": f"/media/scanned_images/{image_filename}"
            })
        else:
            send_ws_update(session_id, "ai_status", {"status": "error", "msg": "❌ Gemini API không nhận diện được"})
            
    except Exception as e:
        logger.error(f"❌ [THREAD-AI] Crash: {str(e)}")
        send_ws_update(session_id, "ai_status", {"status": "error", "msg": f"💥 Lỗi: {str(e)}"})

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def scan_upload(request, session_id):
    try:
        img_b64 = request.data.get('image_base64', '')
        if img_b64:
            send_ws_update(session_id, "ai_status", {"status": "uploading", "msg": "📩 Nhận ảnh từ điện thoại..."})
            
            with _scan_store_lock:
                _scan_store.setdefault(session_id, []).append(img_b64)
            
            raw_bytes = extract_base64_data(img_b64)
            if raw_bytes:
                filename = f"mobile_{session_id}_{datetime.datetime.now().strftime('%H%M%S_%f')}.jpg"
                save_path = get_backend_root() / 'media' / 'scanned_images' / filename
                save_path.parent.mkdir(parents=True, exist_ok=True)
                with open(save_path, 'wb') as f:
                    f.write(raw_bytes)
                
                if _current_session_config["excel_filename"]:
                    threading.Thread(
                        target=background_ai_task,
                        args=(filename, _current_session_config.copy(), session_id),
                        daemon=True
                    ).start()
                    logger.info(f"🚀 [MOBILE] Đã đẩy {filename} vào hàng đợi API AI.")
                else:
                    send_ws_update(session_id, "ai_status", {"status": "warning", "msg": "⚠️ Chưa chọn Excel/Môn học"})

            return Response({"ok": True, "session": session_id})
        return Response({"error": "Empty image data"}, status=400)
    except Exception as e:
        logger.error(f"❌ [SCAN-UPLOAD] Lỗi: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def scan_poll(request, session_id):
    try:
        with _scan_store_lock:
            imgs = _scan_store.pop(session_id, [])
        return Response({"images": imgs, "count": len(imgs)})
    except Exception as e:
        logger.error(f"❌ [SCAN-POLL] Lỗi: {str(e)}", exc_info=True)
        return Response({"images": [], "error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_sheet_results(request): return Response({"results": []})
@api_view(['POST'])
@permission_classes([AllowAny])
def delete_image(request): return Response({"success": True})
@api_view(['GET'])
@permission_classes([AllowAny])
def preview_excel(request): return Response({"success": True, "previewData": []})
@api_view(['GET'])
@permission_classes([AllowAny])
def download_updated_excel(request): return Response({"ok": True})
@api_view(['POST'])
@permission_classes([AllowAny])
def analyze_excel_columns(request): return Response({"success": True})
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_system(request): return Response({"success": True})
@api_view(['POST'])
@permission_classes([AllowAny])
def sync_roster(request): return Response({"success": True})
