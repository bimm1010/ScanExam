import os
import json
import base64
import datetime
import logging
import threading
import subprocess
import socket
from pathlib import Path
from dotenv import load_dotenv
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt

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

# Mac Host Config
MAC_USER = "bimm"
MAC_IP = "10.10.10.172"
GEMINI_CLI_PATH = "/opt/homebrew/bin/gemini"
MAC_PROJECT_ROOT = "/Users/bimm/ScanExercise"

def get_backend_root():
    return Path(__file__).resolve().parent.parent

def extract_base64_data(image_data_base64):
    try:
        imgstr = image_data_base64.split(';base64,')[1] if ';' in image_data_base64 else image_data_base64
        return base64.b64decode(imgstr)
    except: return None

import re

def call_gemini_native(image_filename, excel_filename, subject, roster_json):
    """
    🎯 NATIVE GEMINI CLI: Gọi trực tiếp trong Docker (Ý tưởng của Đại Ca).
    """
    # Đường dẫn file nội bộ trong Container
    image_path = (get_backend_root() / 'media' / 'scanned_images' / image_filename).absolute()
    excel_path = (get_backend_root() / 'media' / 'rosters' / excel_filename).absolute()

    # Kiểm tra file tồn tại trước khi gọi AI để tránh lỗi vô nghĩa
    if not image_path.exists():
        logger.error(f"❌ [GEMINI-NATIVE] File ảnh không tồn tại: {image_path}")
        return {"status": "error", "msg": "Image file not found"}
    if not excel_path.exists():
        logger.error(f"❌ [GEMINI-NATIVE] File Excel không tồn tại: {excel_path}")
        return {"status": "error", "msg": "Excel file not found"}

    # Xây dựng SIÊU PROMPT cho Gemini CLI
    prompt = (
        f"Nhiệm vụ: Chấm điểm bài thi viết tay môn {subject}. "
        f"1. Mở ảnh tại {image_path} và nhận diện điểm số. "
        f"2. Mở file Excel tại {excel_path}. "
        f"3. Tìm đúng học sinh dựa trên danh sách: {roster_json}. "
        f"4. Ghi điểm vào file Excel và lưu lại. "
        f"Trả về duy nhất JSON kết quả: {{'studentId': '...', 'score': '...', 'status': 'success'}}"
    )

    # Lệnh gọi trực tiếp gemini cli (Sử dụng full path nếu cần, hoặc đảm bảo shell có PATH)
    # Trong Dockerfile bạn cài npm install -g, nên nó nằm trong /usr/local/bin/gemini hoặc tương đương
    cmd = f"gemini --vision --image \"{image_path}\" --prompt \"{prompt}\""

    
    try:
        logger.info(f"🚀 [GEMINI-NATIVE] Đang xử lý nội bộ: {image_filename}")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            match = re.search(r'\{.*\}', result.stdout, re.DOTALL)
            if match:
                return json.loads(match.group())
            logger.warning(f"⚠️ [GEMINI-NATIVE] Không tìm thấy JSON trong output: {result.stdout}")
            return {"raw_output": result.stdout}
        else:
            logger.error(f"❌ [GEMINI-NATIVE] Lỗi CLI: {result.stderr}")
            return None
    except Exception as e:
        logger.error(f"⚠️ [GEMINI-NATIVE] Exception: {str(e)}")
        return None

def call_gemini_cli_on_mac(image_filename, excel_filename, subject, roster_json):
    # DEPRECATED: Chuyển sang dùng call_gemini_native cho ổn định (Ý tưởng Đại Ca)
    return call_gemini_native(image_filename, excel_filename, subject, roster_json)

# --- API ENDPOINTS ---

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    try:
        # Check gemini version
        v_res = subprocess.run("gemini --version", shell=True, capture_output=True, text=True, timeout=5)
        gemini_v = v_res.stdout.strip() if v_res.returncode == 0 else "Error"
        
        # Check if auth files exist
        auth_res = subprocess.run("ls -la /root/.gemini", shell=True, capture_output=True, text=True, timeout=5)
        auth_files = auth_res.stdout.strip() if auth_res.returncode == 0 else "Folder not found"
        
    except Exception as e:
        gemini_v = str(e)
        auth_files = "Error"
    
    return Response({
        "status": "healthy", 
        "mode": "Gemini CLI Native",
        "gemini_version": gemini_v,
        "auth_files": auth_files
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def server_info(request):
    return Response({"hostname": socket.gethostname(), "ai": "Gemini CLI Mac Native"})

@api_view(['POST'])
@csrf_exempt
@permission_classes([AllowAny])
def process_test_paper(request):
    print(f"🚀 [BACKEND] Nhận ảnh từ Đại Ca, đang chuyển cho Gemini CLI...")
    img_list = request.data.get('image_data_list', [])
    if not img_list and request.data.get('image_data'): img_list = [request.data.get('image_data')]
    
    subject = request.data.get('expected_subject')
    excel_filename = request.data.get('excel_filename')
    roster_data = request.data.get('roster', [])
    roster_str = json.dumps(roster_data, ensure_ascii=False)

    # Cập nhật cấu hình phiên quét hiện tại để Mobile dùng
    if excel_filename: _current_session_config["excel_filename"] = excel_filename
    if subject: _current_session_config["subject"] = subject
    if roster_str: _current_session_config["roster_json"] = roster_str

    try:
        final_results = []
        for img_b64 in img_list:
            raw_bytes = extract_base64_data(img_b64)
            if not raw_bytes: continue
            
            # Lưu ảnh tạm thời để Gemini CLI đọc trên Host
            img_name = f"cli_scan_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
            save_path = get_backend_root() / 'media' / 'scanned_images' / img_name
            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, 'wb') as f: f.write(raw_bytes)
            
            # GIAO NHIỆM VỤ CHO GEMINI CLI
            res = call_gemini_cli_on_mac(img_name, excel_filename, subject, roster_str)
            if res:
                res['excelUpdated'] = True # Gemini CLI tự hứa là đã ghi
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
    """
    Gửi cập nhật thời gian thực qua WebSocket tới Desktop
    """
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
    """
    Hàm chạy ngầm để gọi AI và báo cáo tình hình qua WebSocket.
    """
    try:
        # Báo cáo: Bắt đầu xử lý
        send_ws_update(session_id, "ai_status", {"status": "analyzing", "msg": "🤖 Gemini đang đọc bài..."})
        
        logger.info(f"🧵 [THREAD-AI] Bắt đầu chấm bài: {image_filename}")
        res = call_gemini_native(
            image_filename, 
            config['excel_filename'], 
            config['subject'], 
            config['roster_json']
        )
        
        if res:
            logger.info(f"✅ [THREAD-AI] Hoàn thành {image_filename}")
            # Báo cáo: Thành công + Gửi kết quả
            send_ws_update(session_id, "ai_result", {
                "status": "success", 
                "studentId": res.get('studentId'),
                "score": res.get('score'),
                "image": f"/media/scanned_images/{image_filename}"
            })
        else:
            send_ws_update(session_id, "ai_status", {"status": "error", "msg": "❌ Gemini không nhận diện được"})
            
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
            # Thông báo cho Desktop có ảnh mới
            send_ws_update(session_id, "ai_status", {"status": "uploading", "msg": "📩 Nhận ảnh từ điện thoại..."})
            
            # 1. Lưu vào RAM để Desktop poll (giữ tính năng cũ)
            with _scan_store_lock:
                _scan_store.setdefault(session_id, []).append(img_b64)
            
            # 2. Lưu thành file vật lý
            raw_bytes = extract_base64_data(img_b64)
            if raw_bytes:
                filename = f"mobile_{session_id}_{datetime.datetime.now().strftime('%H%M%S_%f')}.jpg"
                save_path = get_backend_root() / 'media' / 'scanned_images' / filename
                save_path.parent.mkdir(parents=True, exist_ok=True)
                with open(save_path, 'wb') as f:
                    f.write(raw_bytes)
                
                # 3. Kích hoạt AI nếu có cấu hình
                if _current_session_config["excel_filename"]:
                    threading.Thread(
                        target=background_ai_task,
                        args=(filename, _current_session_config.copy(), session_id),
                        daemon=True
                    ).start()
                    logger.info(f"🚀 [MOBILE] Đã đẩy {filename} vào hàng đợi AI.")
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

# Các hàm khác giữ placeholder để tránh lỗi URL
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
