import os
import json
import base64
import datetime
import logging
import threading
import socket
import re
import pandas as pd
import openpyxl
from pathlib import Path
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from google import genai
from google.genai import types
from django.core.cache import cache
from rapidfuzz import process, fuzz

# Configure Logging
logger = logging.getLogger(__name__)

# AI Processing Pool to prevent Rate Limit and Server Crash
ai_executor = ThreadPoolExecutor(max_workers=5)

def get_session_config():
    return cache.get("global_session_config", {
        "excel_filename": None,
        "subject": None,
        "roster_json": None,
        "sheet_name": None,
        "mapping": {}
    })

def set_session_config(config):
    cache.set("global_session_config", config, timeout=86400)

def add_to_scan_store(session_id, image_b64):
    key = f"scan_store_{session_id}"
    imgs = cache.get(key, [])
    imgs.append(image_b64)
    cache.set(key, imgs, timeout=86400)

def pop_scan_store(session_id):
    key = f"scan_store_{session_id}"
    imgs = cache.get(key, [])
    if imgs:
        cache.delete(key)
    return imgs

# Load environment variables
load_dotenv()

# Kiểm tra Gemini API Key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("⚠️ GEMINI_API_KEY not found in environment variables!")

def get_backend_root():
    return Path(__file__).resolve().parent.parent

def normalize_string(s):
    """Chuẩn hóa chuỗi tiếng Việt: viết thường, bỏ dấu, xóa khoảng trắng thừa."""
    if not s: return ""
    s = str(s).lower().strip()
    s = re.sub(r'[àáạảãâầấậẩẫăằắặẳẵ]', 'a', s)
    s = re.sub(r'[èéẹẻẽêềếệểễ]', 'e', s)
    s = re.sub(r'[ìíịỉĩ]', 'i', s)
    s = re.sub(r'[òóọỏõôồốộổỗơờớợởỡ]', 'o', s)
    s = re.sub(r'[ùúụủũưừứựửữ]', 'u', s)
    s = re.sub(r'[ỳýỵỷỹ]', 'y', s)
    s = re.sub(r'[đ]', 'd', s)
    s = re.sub(r'\s+', ' ', s)
    return s

def extract_base64_data(image_data_base64):
    try:
        if not image_data_base64: return None
        imgstr = image_data_base64.split(';base64,')[1] if ';' in image_data_base64 else image_data_base64
        return base64.b64decode(imgstr)
    except Exception as e:
        logger.error(f"Error decoding base64: {str(e)}")
        return None

def update_excel_score(excel_filename, sheet_name, student_id, score):
    """🎯 Ghi điểm trực tiếp vào ô tương ứng trong file Excel mà không ghi đè toàn bộ."""
    try:
        file_path = get_backend_root() / 'media' / 'rosters' / excel_filename
        if not file_path.exists(): return False

        wb = openpyxl.load_workbook(file_path)
        if sheet_name not in wb.sheetnames: return False

        sheet = wb[sheet_name]
        # Tìm cột điểm dựa trên mapping lưu trong session
        config = get_session_config()
        score_col_name = config.get("mapping", {}).get("score")
        if not score_col_name: return False

        # Tìm index của cột điểm
        col_idx = None
        for cell in sheet[1]: # Dòng 1 là header
            if cell.value == score_col_name:
                col_idx = cell.column
                break

        if not col_idx: return False

        # Tìm dòng của học sinh dựa trên student_id (giả định cột ID là cột đầu hoặc theo mapping)
        id_col_name = config.get("mapping", {}).get("id")
        id_col_idx = None
        for cell in sheet[1]:
            if cell.value == id_col_name:
                id_col_idx = cell.column
                break

        if not id_col_idx: return False

        # Quét các dòng để tìm ID học sinh
        for row in range(2, sheet.max_row + 1):
            cell_id = sheet.cell(row=row, column=id_col_idx).value
            if str(cell_id) == str(student_id):
                sheet.cell(row=row, column=col_idx).value = score
                wb.save(file_path)
                return True
        return False
    except Exception as e:
        logger.error(f"❌ [UPDATE-EXCEL] Error: {str(e)}")
        return False

def call_gemini_native(image_filename, excel_filename, subject, roster_json):
    """🎯 GEMINI API: Sử dụng Google GenAI SDK mới."""
    if not GEMINI_API_KEY:
        logger.error("❌ API Key is missing.")
        return {"status": "error", "msg": "API Key missing"}

    try:
        image_path = (get_backend_root() / 'media' / 'scanned_images' / image_filename).absolute()
        if not image_path.exists():
            return {"status": "error", "msg": "Image file not found"}

        with open(image_path, "rb") as f:
            image_bytes = f.read()

        prompt = (
            f"Nhiệm vụ: Chấm điểm bài thi viết tay môn {subject}. "
            f"Hãy phân tích hình ảnh đính kèm và tìm: "
            f"1. Tên học sinh hoặc Mã số học sinh. "
            f"2. Điểm số của học sinh đó. "
            f"Danh sách học sinh có thể tham khảo (nếu có): {roster_json}. "
            f"Chỉ trả về JSON duy nhất: {{'studentId': '...', 'studentName': '...', 'score': '...', 'status': 'success'}}"
        )

        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0
            )
        )

        result_text = response.text.strip()
        return json.loads(result_text)
    except Exception as e:
        logger.error(f"⚠️ [GEMINI-API] Exception: {str(e)}")
        return None

# --- API ENDPOINTS ---

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        "status": "healthy",
        "mode": "Gemini API SDK + Pandas Core + OpenPyXL",
        "api_key_configured": bool(GEMINI_API_KEY)
    })

@api_view(['POST'])
@csrf_exempt
@permission_classes([AllowAny])
def process_test_paper(request):
    img_list = request.data.get('image_data_list', [])
    if not img_list and request.data.get('image_data'):
        img_list = [request.data.get('image_data')]

    subject = request.data.get('expected_subject')
    excel_filename = request.data.get('excel_filename')
    roster_data = request.data.get('roster', [])
    roster_str = json.dumps(roster_data, ensure_ascii=False)

    # Sync session config
    config = get_session_config()
    if excel_filename: config["excel_filename"] = excel_filename
    if subject: config["subject"] = subject
    if roster_str: config["roster_json"] = roster_str
    set_session_config(config)

    try:
        final_results = []
        for img_b64 in img_list:
            raw_bytes = extract_base64_data(img_b64)
            if not raw_bytes: continue

            img_name = f"scan_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
            save_path = get_backend_root() / 'media' / 'scanned_images' / img_name
            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, 'wb') as f: f.write(raw_bytes)

            res = call_gemini_native(img_name, excel_filename, subject, roster_str)
            if res:
                # Tự động ghi vào Excel nếu có thông tin
                if res.get('studentId') and res.get('score'):
                    update_excel_score(excel_filename, config.get("sheet_name", ""), res['studentId'], res['score'])

                res['image_url'] = f"/media/scanned_images/{img_name}"
                final_results.append(res)

        return Response(final_results)
    except Exception as e:
        logger.error(f"❌ [PROCESS-PAPER] Lỗi: {str(e)}")
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

        # Update session config
        config = get_session_config()
        config["excel_filename"] = filename
        set_session_config(config)

        # Kích hoạt xử lý lại các ảnh đang chờ (nếu có trong scan_store)
        # Ở đây ta có thể quét thư mục scanned_images để xử lý những ảnh chưa có điểm

        return Response({"success": True, "filename": filename})
    except Exception as e: return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def preview_excel(request):
    filename = request.query_params.get('filename')
    sheet_name = request.query_params.get('sheet')
    if not filename: return Response({"error": "Filename required"}, status=400)

    try:
        file_path = get_backend_root() / 'media' / 'rosters' / filename
        if not file_path.exists(): return Response({"error": "File not found"}, status=404)

        xl = pd.ExcelFile(file_path)
        sheets = xl.sheet_names

        target_sheet = sheet_name if sheet_name in sheets else sheets[0]
        config = get_session_config()
        config["sheet_name"] = target_sheet # Save to session
        set_session_config(config)

        df = pd.read_excel(file_path, sheet_name=target_sheet).fillna("")

        return Response({
            "success": True,
            "sheets": sheets,
            "currentSheet": target_sheet,
            "previewData": df.to_dict(orient='records'),
            "columns": list(df.columns)
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def analyze_excel_columns(request):
    filename = request.data.get('filename')
    sheet_name = request.data.get('sheet')
    if not filename: return Response({"error": "No filename"}, status=400)

    try:
        file_path = get_backend_root() / 'media' / 'rosters' / filename
        df = pd.read_excel(file_path, sheet_name=sheet_name).fillna("")
        cols = [str(c).lower() for c in df.columns]

        mapping = {"id": "", "name": "", "score": ""}
        for i, c in enumerate(cols):
            if any(x in c for x in ["mã", "msv", "id", "stt"]): mapping["id"] = df.columns[i]
            if any(x in c for x in ["tên", "họ", "name"]): mapping["name"] = df.columns[i]
            if any(x in c for x in ["điểm", "score", "grade"]): mapping["score"] = df.columns[i]

        config = get_session_config()
        config["mapping"] = mapping # Save to session
        set_session_config(config)
        return Response({"success": True, "mapping": mapping, "columns": list(df.columns)})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def sync_roster(request):
    """Lưu dữ liệu roster từ frontend ngược lại file Excel."""
    filename = request.data.get('filename')
    sheet_name = request.data.get('sheet')
    roster_data = request.data.get('roster')
    mapping = request.data.get('mapping')

    if not all([filename, sheet_name, roster_data]):
        return Response({"error": "Missing data"}, status=400)

    try:
        file_path = get_backend_root() / 'media' / 'rosters' / filename
        with pd.ExcelWriter(file_path, engine='openpyxl', mode='a', if_sheet_exists='replace') as writer:
            df_new = pd.DataFrame(roster_data)
            df_new.to_excel(writer, sheet_name=sheet_name, index=False)

        return Response({"success": True, "msg": "Đã đồng bộ file Excel thành công"})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_system(request):
    set_session_config({"excel_filename": None, "subject": None, "roster_json": None, "sheet_name": None, "mapping": {}})
    return Response({"success": True})

# --- WebSocket Helpers & Scan Endpoints ---
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

def send_ws_update(session_id, message_type, data):
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"scan_{session_id}",
            {"type": "scan_message", "message": {"type": message_type, "payload": data}}
        )

def background_ai_task(image_filename, config, session_id):
    try:
        send_ws_update(session_id, "ai_status", {"status": "analyzing", "msg": "🤖 Gemini đang phân tích bài..."})
        res = call_gemini_native(image_filename, config['excel_filename'], config['subject'], config['roster_json'])
        if res:
            # Ghi điểm trực tiếp vào Excel
            if res.get('studentId') and res.get('score'):
                update_excel_score(config['excel_filename'], config.get('sheet_name', ''), res['studentId'], res['score'])

            send_ws_update(session_id, "ai_result", {
                "status": "success",
                "studentId": res.get('studentId'),
                "score": res.get('score'),
                "image": f"/media/scanned_images/{image_filename}"
            })
    except Exception as e:
        send_ws_update(session_id, "ai_status", {"status": "error", "msg": f"💥 Lỗi: {str(e)}"})

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def scan_upload(request, session_id):
    img_b64 = request.data.get('image_base64', '')
    if img_b64:
        add_to_scan_store(session_id, img_b64)
        raw_bytes = extract_base64_data(img_b64)
        if raw_bytes:
            filename = f"mobile_{session_id}_{datetime.datetime.now().strftime('%H%M%S_%f')}.jpg"
            save_path = get_backend_root() / 'media' / 'scanned_images' / filename
            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, 'wb') as f: f.write(raw_bytes)

            config = get_session_config()
            if config.get("excel_filename"):
                # Sử dụng ThreadPoolExecutor thay vì threading.Thread trực tiếp
                ai_executor.submit(background_ai_task, filename, config.copy(), session_id)
            else:
                # Gửi thông báo cho User là ảnh đã lưu nhưng chưa có Excel để xử lý
                send_ws_update(session_id, "ai_status", {"status": "pending", "msg": "⏳ Ảnh đã lưu, vui lòng upload file Excel để bắt đầu chấm điểm."})
        return Response({"ok": True})
    return Response({"error": "Empty data"}, status=400)

@api_view(['GET'])
@permission_classes([AllowAny])
def scan_poll(request, session_id):
    imgs = pop_scan_store(session_id)
    return Response({"images": imgs, "count": len(imgs)})

@api_view(['GET'])
@permission_classes([AllowAny])
def server_info(request):
    return Response({"hostname": socket.gethostname(), "ai": "Gemini 1.5 Flash API + Pandas Core + OpenPyXL"})

@api_view(['GET'])
@permission_classes([AllowAny])
def get_sheet_results(request): return Response({"results": []})
@api_view(['POST'])
@permission_classes([AllowAny])
def delete_image(request): return Response({"success": True})
@api_view(['GET'])
@permission_classes([AllowAny])
def download_updated_excel(request): return Response({"ok": True})
