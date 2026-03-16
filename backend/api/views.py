import os
import json
import base64
import datetime
import re
import unicodedata
import shutil
from pathlib import Path
from dotenv import load_dotenv
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import google.genai as genai
from google.genai import types
import openpyxl
from django.http import FileResponse
from rapidfuzz import process, fuzz

# Load environment variables
load_dotenv()

# Configure Gemini client (new SDK)
api_keys_raw = os.getenv("GEMINI_API_KEY", "")
api_keys = [k.strip() for k in api_keys_raw.split(",") if k.strip()]
current_key_index = 0

def get_gemini_client():
    global current_key_index
    if not api_keys:
        return None
    return genai.Client(api_key=api_keys[current_key_index])

client = get_gemini_client()

# Constants for security
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB limit
ALLOWED_IMAGE_EXTENSIONS = ['JPG', 'JPEG', 'PNG', 'WEBP']

def get_backend_root():
    """Returns the absolute path to the backend directory."""
    return Path(__file__).resolve().parent.parent

def extract_base64_data(image_data_base64):
    """Refactored helper to extract mime type and bytes from base64 string."""
    try:
        if ';' in image_data_base64 and 'base64,' in image_data_base64:
            format_part, imgstr = image_data_base64.split(';base64,')
            mime_type = format_part.split(':')[1] if ':' in format_part else 'image/jpeg'
        else:
            imgstr = image_data_base64
            mime_type = "image/jpeg"
        
        return mime_type, base64.b64decode(imgstr)
    except Exception as e:
        print(f"❌ Error extracting base64 data: {str(e)}")
        return "image/jpeg", None

def normalize_string(text):
    """Normalizes string: lowercase, removal of accents, and extra spaces."""
    if not text:
        return ""
    # Lowercase
    text = str(text).lower().strip()
    # Remove accents
    text = ''.join(c for c in unicodedata.normalize('NFD', text)
                  if unicodedata.category(c) != 'Mn')
    # Replace non-alphanumeric with space and collapse spaces
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def translate_error(error_msg):
    """Translates technical errors into teacher-friendly Vietnamese messages."""
    msg = str(error_msg).lower()
    if "429" in msg or "quota" in msg or "resource_exhausted" in msg:
        return "Hệ thống đang hơi bận vì nhiều người dùng cùng lúc. Đại ca đợi em khoảng vài giây rồi quét tiếp nhé! (≧◡≦)"
    if "api_key" in msg or "client" in msg:
        return "Hình như API Key đang gặp trục trặc. Đại ca kiểm tra lại file .env giúp em nhé! (╥﹏╥)"
    if "sheet" in msg or "worksheet" in msg:
        return "Em không tìm thấy tên môn học này trong file Excel. Đại ca kiểm tra lại xem tên sheet đã đúng chưa ạ?"
    if "file" in msg or "not found" in msg:
        return "Em không tìm thấy file Excel. Đại ca thử tải lại file lên xem sao nhé."
    if "timeout" in msg:
        return "Kết nối mạng hơi chậm, Đại ca thử lại giúp em nhé!"
    return f"Có xíu lỗi xảy ra: {error_msg}. Đại ca thử lại giúp em nhé!"

def fuzzy_match_student(detected_name, roster_choices):
    """
    Tries to find the best match for a detected name in the roster using fuzzy matching.
    roster_choices should be a dict: {normalized_name: student_data}
    Uses a hybrid scoring method: WRatio for general similarity + Token Sort Ratio for name order swaps.
    """
    if not detected_name or not roster_choices:
        return None, None, 0
    
    query = normalize_string(detected_name)
    
    # 1. Primary Match (WRatio) - Good for overall similarity
    best_match = process.extractOne(query, roster_choices.keys(), scorer=fuzz.WRatio)
    
    if best_match:
        matched_key = best_match[0]
        score = best_match[1]
        
        # 2. Secondary Validation (Token Sort Ratio) - Crucial for Vietnamese name order swaps
        # If score is mediocre (75-90), we double-check with Token Sort Ratio
        if score < 90:
            token_score = fuzz.token_sort_ratio(query, matched_key)
            # If token sort score is very high, boost the overall score
            if token_score > 92:
                score = max(score, token_score)
        
    if score >= 85: # High confidence
        student_data = roster_choices[matched_key]
        return student_data['id'], student_data['name'], score
        
    # 3. Fallback: If match is uncertain, try matching without ANY non-alpha chars (pure tokens)
    # This helps if names have weird symbols or extra spaces AI picked up
    query_clean = re.sub(r'[^a-zA-Z0-9]', '', query)
    best_fallback = None
    max_fallback_score = 0
    
    for roster_key, s_data in roster_choices.items():
        rk_clean = re.sub(r'[^a-zA-Z0-9]', '', roster_key)
        f_score = fuzz.ratio(query_clean, rk_clean)
        if f_score > max_fallback_score:
            max_fallback_score = f_score
            best_fallback = s_data
            
    if max_fallback_score >= 90:
        return best_fallback['id'], best_fallback['name'], max_fallback_score
        
    return None, None, 0
    
    return None, None, 0

def backup_roster(filename):
    """Creates a backup of the roster file before modification."""
    try:
        source_path = get_backend_root() / 'media' / 'rosters' / filename
        if not source_path.exists():
            return False
            
        backup_dir = get_backend_root() / 'media' / 'rosters' / 'backups'
        if not backup_dir.exists():
            backup_dir.mkdir(parents=True, exist_ok=True)
            
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = backup_dir / f"backup_{timestamp}_{filename}"
        shutil.copy2(source_path, backup_path)
        print(f"📁 Backup created: {backup_path.name}")
        return True
    except Exception as e:
        print(f"❌ Backup failed: {str(e)}")
        return False

def sanitize_sheet_name(sheet_name):
    """Sanitizes sheet name for use in filenames and safety."""
    if not sheet_name:
        return "default"
    # Remove all non-alphanumeric except spaces, then slugify
    clean_name = re.sub(r'[^\w\s-]', '', sheet_name).strip()
    clean_name = re.sub(r'[-\s]+', '_', clean_name)
    return clean_name or "default"

@api_view(['GET'])
def health_check(request):
    return Response({"status": "healthy", "message": "ScanExercise API is running"})

@api_view(['GET'])
def get_sheet_results(request):
    """Returns list of results for a specific sheet/subject."""
    subject = request.GET.get('subject')
    if not subject:
        return Response({"error": "Thiếu tên môn học Đại Ca ơi!"}, status=status.HTTP_400_BAD_REQUEST)
    
    sanitized = sanitize_sheet_name(subject)
    results_path = get_backend_root() / f"scanning_results_{sanitized}.json"
    
    if not results_path.exists():
        return Response([])
    
    try:
        with open(results_path, 'r', encoding='utf-8') as f:
            return Response(json.load(f))
    except Exception:
        return Response([])

def call_gemini_with_router(prompt, image_bytes, mime_type="image/jpeg"):
    """
    Calls Gemini with automatic model fallback for Quota and Accuracy.
    Models priority: 2.0 Flash -> 1.5 Flash (Quota fallback) -> 1.5 Pro (Logic fallback)
    """
    models_to_try = [
        'gemini-2.0-flash',
        'gemini-flash-latest',
        'gemini-1.5-flash',
        'gemini-2.5-flash'
    ]
    
    global client, current_key_index
    
    last_error = None
    
    for model_name in models_to_try:
        # Retry with key rotation if we hit a 429
        for key_attempt in range(max(1, len(api_keys))):
            try:
                print(f"🤖 Attempting with model: {model_name} (Key Index: {current_key_index})")
                
                # Support list of images or single image
                if isinstance(image_bytes, list):
                    contents = [prompt]
                    for img in image_bytes:
                        contents.append(types.Part(
                            inline_data=types.Blob(mime_type=mime_type, data=img)
                        ))
                else:
                    image_part = types.Part(
                        inline_data=types.Blob(mime_type=mime_type, data=image_bytes)
                    )
                    contents = [prompt, image_part]
                
                if not client:
                    raise Exception("Gemini client is not initialized. Check your GEMINI_API_KEY.")

                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_mime_type='application/json',
                    )
                )
                
                raw_text = response.text.strip()
                try:
                    result = json.loads(raw_text)
                except Exception:
                    clean_text = re.sub(r'```json\s*|\s*```', '', raw_text)
                    result = json.loads(clean_text)
                
                # Basic validation: If it's a batch, we expect a list
                if isinstance(image_bytes, list) and not isinstance(result, list):
                    # If AI returned single object instead of list, wrap it
                    result = [result]
                    
                print(f"✅ Success with model: {model_name}")
                return result
                
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                
                # Check for rate limit error (Quota exceeded)
                if "429" in error_str or "quota" in error_str or "resource_exhausted" in error_str:
                    if len(api_keys) > 1:
                        current_key_index = (current_key_index + 1) % len(api_keys)
                        client = get_gemini_client()
                        print(f"🔄 Rate limit hit. Rotating to next API Key (Index: {current_key_index})...")
                        continue # Try same model with next key
                    else:
                        print(f"⚠️ Rate limit hit and only 1 key available. Trying next model...")
                        break # Try next model
                else:
                    print(f"❌ Error with model {model_name}: {str(e)}")
                    break # Try next model
                    
    if last_error:
        raise last_error
    raise Exception("All models and keys failed to respond.")

def save_result_to_json(result, sheet_name=None):
    """Helper to save/append results to a local JSON file corresponding to the sheet name."""
    clean_name = sanitize_sheet_name(sheet_name)
    filename = f'scanning_results_{clean_name}.json' if sheet_name else 'scanning_results.json'
    file_path = get_backend_root() / filename

    data = []
    
    # Read existing data if file exists
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception:
            data = []
            
    # Append new result with timestamp
    result['scanned_at'] = datetime.datetime.now().isoformat()
    data.append(result)
    
    # Save back to file
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ Result saved to {filename}. Total records: {len(data)}")
    except Exception as e:
        print(f"❌ Error saving JSON file: {str(e)}")

def save_image_on_server(image_data_base64):
    """Saves base64 image to media/scanned_images folder and returns URL."""
    try:
        # 1. Prepare directory
        save_dir = get_backend_root() / 'media' / 'scanned_images'
        if not save_dir.exists():
            save_dir.mkdir(parents=True, exist_ok=True)
            
        # 2. Extract image data
        mime_type, image_bytes = extract_base64_data(image_data_base64)
        if not image_bytes:
            return None
            
        ext = mime_type.split('/')[-1]
        if ext == 'jpeg':
            ext = 'jpg'
            
        # 3. Generate filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"scan_{timestamp}_{os.urandom(4).hex()}.{ext}"
        filepath = save_dir / filename
        
        # 4. Save file
        with open(filepath, "wb") as f:
            f.write(image_bytes)
            
        # 5. Return URL relative to server root
        print(f"✅ Image saved: {filename}")
        return f"/media/scanned_images/{filename}"
    except Exception as e:
        print(f"❌ Error saving image: {str(e)}")
        return None

@api_view(['POST'])
def process_test_paper(request):
    """
    Endpoint to process an image of a student's test paper.
    Expects:
    - image_data: base64 encoded image string (for single image, legacy)
    - image_data_list: list of base64 encoded image strings (for multiple images)
    - roster: list of student objects {id, name}
    - expected_subject: string
    """
    image_data_base64 = request.data.get('image_data')  # Single image (legacy support)
    image_data_list = request.data.get('image_data_list', []) # Multiple images
    roster = request.data.get('roster', [])
    expected_subject = request.data.get('expected_subject')
    
    # 0. Sanitize expected_subject for filenames
    sanitized_expected = sanitize_sheet_name(expected_subject)
    
    # Convert single image to list for uniform processing
    if image_data_base64 and not image_data_list:
        image_data_list = [image_data_base64]

    if not image_data_list:
        return Response({"error": "Đại Ca ơi, chưa có dữ liệu ảnh kìa! (o^ ^o)"}, status=status.HTTP_400_BAD_REQUEST)
    print(f"📥 Incoming process_test_paper request: {len(image_data_list)} images, subject: {expected_subject}, file: {request.data.get('excel_filename')}")
    
    if not client:
        return Response({"error": "Lỗi cấu hình: Thiếu API Key cho Gemini CLI/SDK."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        # 1. Extract and Validate all images
        batch_bytes = []
        # Assume all images in a batch have the same mime_type for simplicity
        # or determine it from the first valid image.
        first_mime_type = "image/jpeg" 
        for img_b64 in image_data_list:
            mime_type, image_bytes = extract_base64_data(img_b64)
            if image_bytes:
                # Security: Check image size
                if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
                    return Response({
                        "error": f"Ảnh 'bé bự' quá ({len(image_bytes)/(1024*1024):.1f}MB), giới hạn là 10MB thôi ạ!"
                    }, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
                batch_bytes.append(image_bytes)
                if first_mime_type == "image/jpeg": # Update if a more specific type is found
                    first_mime_type = mime_type
        
        if not batch_bytes:
            return Response({"error": "Không trích xuất được dữ liệu ảnh nào."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Build the Optimized BATCH Prompt
        roster_json = json.dumps(roster, ensure_ascii=False)
        is_batch = len(batch_bytes) > 1
        
        prompt = f"""Bạn là một chuyên gia AI về giáo dục, phụ trách chấm điểm bài thi.
Hãy phân tích {'các' if is_batch else 'bức'} ảnh bài thi được đính kèm để trích xuất thông tin học sinh và kết quả.

--- DANH SÁCH HỌC SINH (ROSTER) ---
{roster_json}
--------------------------------

--- CHỈ THỊ CỐT LÕI ---
1. PHÂN TÍCH: Tìm Số thứ tự (STT/No) và Họ tên trên bài thi của TỪNG ảnh.
2. ĐỐI CHIẾU: So khớp với Roster trên. Nếu không tìm thấy ID chính xác, hãy chọn ID có tên gần giống nhất.
3. KẾT QUẢ: Trích xuất Điểm số (0.0-10.0), Môn học, và Phân loại (level: nếu score >= 9.0 thì là 'T', còn lại là 'H').
4. BẮT BUỘC: Luôn trả về đầy đủ các trường dữ liệu. Nếu không tìm thấy, hãy để "null" nhưng phải cố gắng suy luận từ ảnh.

Hãy trả về một {'MẢNG (Array) các đối tượng' if is_batch else 'ĐỐI TƯỢNG (Object)'} JSON theo đúng cấu trúc:
{{
    "studentId": "id từ Roster (vd: 0123...)",
    "studentName": "name từ Roster (vd: Nguyễn Văn A)",
    "score": 9.5,
    "subject": "Tên môn học trích xuất được",
    "level": "T"
}}
"""

        # 3. Call Gemini API via Smart Router
        ai_results = call_gemini_with_router(prompt, batch_bytes, first_mime_type)
        
        if ai_results is None:
            print("❌ AI returned None")
            return Response({"error": "Không nhận được phản hồi từ AI."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Ensure ai_results is a list even for single image
        if not isinstance(ai_results, list):
            ai_results = [ai_results]
            
        print(f"📡 AI Response: {len(ai_results)} results extracted.")
            
        # 4. Pre-normalization for Efficiency (Super Reviewer Choice 🚀)
        roster_ids = [normalize_string(s.get('id')) for s in roster if s.get('id')]
        # Pre-normalize for fuzzy matching once per batch
        roster_choices = {normalize_string(s['name']): s for s in roster if s.get('name')}
        
        final_responses = []
        excel_filename = request.data.get('excel_filename')
        mapping_config = request.data.get('mapping_config')
        
        # Batch Excel Logic: Load once per batch
        wb = None
        sheet = None
        excel_path = None
        row_id_map = {} # O(1) Row Lookup Cache 🚀
        
        if excel_filename and mapping_config:
            try:
                backup_roster(excel_filename) # Backup once per session
                excel_path = get_backend_root() / 'media' / 'rosters' / excel_filename
                if excel_path.exists():
                    wb = openpyxl.load_workbook(excel_path)
                    sheet = wb.active
                    norm_expected_sheet = normalize_string(expected_subject)
                    found_sheet = False
                    for s in wb.worksheets:
                        if normalize_string(s.title) == norm_expected_sheet:
                            sheet = s
                            found_sheet = True
                            print(f"🎯 Matched Sheet: '{s.title}' for subject '{expected_subject}'")
                            break
                    
                    if not found_sheet:
                        print(f"⚠️ No sheet matched '{expected_subject}'. Using active sheet: '{sheet.title}'")
                    
                    # Pre-cache row indices for O(1) lookup
                    if sheet:
                        id_col = int(mapping_config.get('idCol', 1))
                        header_row = int(mapping_config.get('headerRow', 1))
                        for row_idx in range(header_row + 1, sheet.max_row + 1):
                            val = sheet.cell(row=row_idx, column=id_col).value
                            if val:
                                row_id_map[normalize_string(val)] = row_idx
                        print(f"📊 RowIndexCache built: {len(row_id_map)} students mapped.")
            except Exception as e:
                print(f"⚠️ Failed to load Excel for batch: {str(e)}")

        # 5. Process each result
        for idx, result in enumerate(ai_results):
            # Security & Logic: Validate studentId exists in roster
            if result.get('studentId') and normalize_string(result.get('studentId')) not in roster_ids:
                print(f"⚠️ AI returned non-existent studentId: {result.get('studentId')}")
            
            # Save the physical file on server
            if idx < len(image_data_list):
                result['imageUrl'] = save_image_on_server(image_data_list[idx])
            
            # Logic: Match Subject
            if result.get('mismatch'):
                # Delete the physical file if subjects don't match
                if result.get('imageUrl'):
                    full_path = get_backend_root() / result['imageUrl'].lstrip('/')
                    if full_path.exists():
                        full_path.unlink()
                        print(f"🗑️ Deleted mismatching image: {full_path.name}")
            else:
                # 6. Advanced Matching Fallback (Fuzzy)
                student_id = result.get('studentId')
                student_name_on_test = result.get('studentName')
                
                if not student_id and student_name_on_test:
                    f_id, f_name, f_score = fuzzy_match_student(student_name_on_test, roster_choices)
                    if f_id:
                        print(f"🎯 Fuzzy Match Found: '{student_name_on_test}' -> '{f_name}' ({f_score}%)")
                        result['studentId'] = f_id
                        result['studentName'] = f_name
                        result['isFuzzyMatch'] = True
                        result['fuzzyScore'] = f_score
                        student_id = f_id
                
                # 7. Memory Update (Write to loaded workbook using RowIndexCache 🚀)
                if sheet and student_id:
                    try:
                        s_id_norm = normalize_string(student_id)
                        score_col = int(mapping_config.get('scoreCol', 2))
                        level_col = int(mapping_config.get('levelCol', 3))
                        
                        found_row = row_id_map.get(s_id_norm)
                        
                        if found_row:
                            sheet.cell(row=found_row, column=score_col).value = result.get('score')
                            sheet.cell(row=found_row, column=level_col).value = result.get('level')
                            result['excelUpdated'] = True # Explicit flag for frontend 🚀
                            print(f"📝 Memory Update for Student {student_id} (Row {found_row})")
                        else:
                            print(f"⚠️ Student ID {student_id} not found in Excel sheet.")
                    except Exception as ex:
                        print(f"❌ Mem-Update error: {str(ex)}")

            if result.get('studentId') or result.get('score') is not None:
                save_result_to_json(result, sheet_name=sanitized_expected)
            
            final_responses.append(result)

        # 8. Commit changes to Disk (LOAD ONCE, SAVE ONCE 🚀)
        if wb and excel_path:
            try:
                wb.save(excel_path)
                print(f"💾 BATCH EXCEL SAVED: {excel_filename}")
            except Exception as e:
                print(f"❌ Failed to save final batch: {str(e)}")
        
        # If single result, return object for compatibility, else list
        return Response(final_responses[0] if len(final_responses) == 1 else final_responses)

    except Exception as e:
        print(f"❌ Error in process_test_paper: {str(e)}")
        error_msg = translate_error(e)
        return Response({"error": error_msg, "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def delete_image(request):
    """Endpoint to manually delete an image file."""
    image_url = request.data.get('image_url')
    if not image_url:
        return Response({"error": "No image_url provided"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Security: prevent path traversal
        clean_path = image_url.lstrip('/')
        if '..' in clean_path or not clean_path.startswith('media/scanned_images/'):
             return Response({"error": "Invalid path"}, status=status.HTTP_403_FORBIDDEN)
             
        full_path = get_backend_root() / clean_path
        if full_path.exists():
            full_path.unlink()
            return Response({"success": True, "message": "File deleted"})
        return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def upload_roster_excel(request):
    """Endpoint to upload the roster Excel file for server-side processing."""
    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        save_dir = get_backend_root() / 'media' / 'rosters'
        if not save_dir.exists():
            save_dir.mkdir(parents=True, exist_ok=True)
            
        # Secure filename with timestamp
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"roster_{timestamp}_{file_obj.name}"
        save_path = save_dir / filename
        
        with open(save_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)
                
        return Response({"success": True, "filename": filename})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def download_updated_excel(request):
    """Endpoint to download the updated Excel file with original filename preserved."""
    filename = request.query_params.get('filename')
    if not filename:
        return Response({"error": "No filename provided"}, status=status.HTTP_400_BAD_REQUEST)
    
    file_path = get_backend_root() / 'media' / 'rosters' / filename
    if file_path.exists():
        # Strip the roster_YYYYMMDD_HHMMSS_ prefix to give back the original name
        # roster_20240316_123456_MyFile.xlsx -> MyFile.xlsx
        display_name = filename
        if filename.startswith("roster_") and len(filename) > 23:
            # roster_ (7) + timestamp (15) + _ (1) = 23 chars
            display_name = filename[23:]
            
        print(f"📦 Downloading: {filename} as '{display_name}'")
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=display_name)
    
    return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def analyze_excel_columns(request):
    """
    Uses AI to analyze sample rows from an Excel sheet and identify column mappings.
    Input: sample_data (list of RowSample objects)
    Output: { idCol, nameCol, scoreCol, levelCol, headerRow }
    """
    sample_data = request.data.get('sample_data', [])
    if not sample_data:
        return Response({"error": "Không có dữ liệu mẫu để phân tích."}, status=status.HTTP_400_BAD_REQUEST)

    if not client:
        return Response({"error": "Lỗi cấu hình: Thiếu API Key cho Gemini."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        # Format sample data for prompt - include boldness info to help detect headers
        formatted_rows = ""
        for row in sample_data:
            cells_info = []
            row_values = row.get('values', [])
            row_metadata = row.get('metadata', [])
            
            for i, val in enumerate(row_values):
                meta = row_metadata[i] if i < len(row_metadata) else {}
                bold_tag = "[B]" if meta.get('isBold') else ""
                cell_text = str(val) if val is not None else "-"
                cells_info.append(f"{bold_tag}{cell_text}")
                
            formatted_rows += f"Dòng {row.get('rowNumber')}: {' | '.join(cells_info)}\n"

        prompt = f"""Bạn là một Chuyên gia Dữ liệu Excel (Senior Data Engineer).
Hãy phân tích 30 dòng dữ liệu dưới đây từ một file danh sách lớp của giáo viên Việt Nam.
Ký tự [B] đứng trước dữ liệu nghĩa là ô đó được in đậm (Bold) - thường là tiêu đề.

DỮ LIỆU MẪU:
{formatted_rows}

--- QUY TẮC PHÂN TÍCH QUAN TRỌNG (BẮT BUỘC) ---
1. 'headerRow': Là dòng chứa các tiêu đề (STT, Mã học sinh, Họ và tên...). Thường là dòng có nhiều ô in đậm [B].
2. 'dataRowStart': Là dòng CHỨA HỌC SINH ĐẦU TIÊN (vd: dòng có STT là 1). PHẢI lớn hơn 'headerRow'. KHÔNG chọn dòng tiêu đề làm dataRowStart.
3. 'idCol' (Mã HS): 
   - KHÔNG chọn cột 'STT' (1, 2, 3...) làm Mã HS nếu có cột 'Mã định danh', 'Mã học sinh', 'MSHS' hoặc 'SBD'.
   - Ưu tiên chọn cột chứa mã số dài (vd: 0140535155).
4. 'nameCol' (Họ và tên):
   - Phải là cột chứa tên người đầy đủ hoặc Họ và tên lót.
5. 'scoreCol' & 'levelCol': 
   - Nếu không có cột 'Điểm'/'Mức đạt' sẵn, hãy chọn cột trống đầu tiên SAU các cột dữ liệu hiện có.
   - Ví dụ: Nếu file có 4 cột A, B, C, D thì Điểm là 5 (E), Mức đạt là 6 (F).

--- YÊU CẦU TRẢ VỀ JSON (1-based index) ---
{{
    "idCol": number (index cột Mã HS, vd: 2),
    "nameCol": number (index cột Họ tên, vd: 3),
    "scoreCol": number (index cột Điểm),
    "levelCol": number (index cột Mức đạt),
    "headerRow": number (index dòng tiêu đề),
    "dataRowStart": number (index dòng học sinh đầu tiên),
    "confidence": number (0-100),
    "cleaningRules": ["vd: Bỏ qua cột STT để lấy Mã định danh", "vd: Dữ liệu bắt đầu từ dòng 2"]
}}
"""

        # Call Gemini (using flash-latest for maximum quota and reliability)
        response = client.models.generate_content(
            model='models/gemini-flash-latest',
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type='application/json',
            )
        )
        
        # Strip potential markdown fences if model doesn't respect JSON mode perfectly
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
            
        result = json.loads(raw_text)
        
        # Validation & Defaults
        default_fields = {
            "idCol": 1, "nameCol": 2, "scoreCol": 3, "levelCol": 4, 
            "headerRow": 1, "dataRowStart": 2, "confidence": 0, "cleaningRules": []
        }
        for field, default in default_fields.items():
            if field not in result:
                result[field] = default

        print(f"🕵️ Structural Intelligence Result (Confidence: {result['confidence']}%): {result}")
        return Response(result)

    except Exception as e:
        print(f"❌ Error in analyze_excel_columns: {str(e)}")
        # Don't return defaults here, so the frontend knows something actually failed
        return Response({
            "error": "AI không thể phân tích file này. Vui lòng kiểm tra lại API Key hoặc quota.",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def sync_roster(request):
    """
    Manually sync roster data from frontend to Excel file.
    Expects: { roster: StudentData[], excel_filename: string, mapping_config: MappingConfig, expected_subject: string }
    """
    roster = request.data.get('roster')
    excel_filename = request.data.get('excel_filename')
    mapping_config = request.data.get('mapping_config')
    expected_subject = request.data.get('expected_subject')

    if not all([roster, excel_filename, mapping_config]):
        return Response({"error": "Thiếu dữ liệu đồng bộ (roster/file/mapping)."}, status=status.HTTP_400_BAD_REQUEST)

    excel_path = get_backend_root() / 'media' / 'rosters' / excel_filename
    if not excel_path.exists():
        return Response({"error": f"Không tìm thấy file Excel: {excel_filename}"}, status=status.HTTP_404_NOT_FOUND)

    try:
        backup_roster(excel_filename)
        wb = openpyxl.load_workbook(excel_path)
        sheet = wb.active
        
        # Select correct sheet
        if expected_subject:
            norm_expected = normalize_string(expected_subject)
            for s in wb.worksheets:
                if normalize_string(s.title) == norm_expected:
                    sheet = s
                    break

        id_col = mapping_config.get('idCol')
        score_col = mapping_config.get('scoreCol')
        level_col = mapping_config.get('levelCol')
        data_row_start = mapping_config.get('dataRowStart', 2)

        # Build row map for efficiency
        row_id_map = {}
        for row in range(data_row_start, sheet.max_row + 1):
            val = sheet.cell(row=row, column=id_col).value
            if val:
                row_id_map[normalize_string(str(val))] = row

        updates_count = 0
        for student in roster:
            s_id = normalize_string(str(student.get('id')))
            if s_id in row_id_map:
                row = row_id_map[s_id]
                score = student.get('score')
                level = student.get('level')
                # Only update if score is not None
                if score is not None:
                    sheet.cell(row=row, column=score_col).value = score
                    if level_col and level_col > 0:
                        sheet.cell(row=row, column=level_col).value = level
                    updates_count += 1

        wb.save(excel_path)
        print(f"✅ Manual Sync Complete: {updates_count} students updated in {excel_filename}")
        return Response({"success": True, "updates_count": updates_count})

    except Exception as e:
        print(f"❌ Sync Roster Error: {str(e)}")
        return Response({"error": f"Lỗi đồng bộ dữ liệu: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
