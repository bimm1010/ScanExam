import re

with open('backend/api/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. update_excel_score
old_1 = """        # Tìm cột điểm dựa trên mapping lưu trong session
        score_col_name = _current_session_config["mapping"].get("score")"""
new_1 = """        # Tìm cột điểm dựa trên mapping lưu trong session
        config = get_session_config()
        score_col_name = config.get("mapping", {}).get("score")"""
content = content.replace(old_1, new_1)

old_2 = """        # Tìm dòng của học sinh dựa trên student_id (giả định cột ID là cột đầu hoặc theo mapping)
        id_col_name = _current_session_config["mapping"].get("id")"""
new_2 = """        # Tìm dòng của học sinh dựa trên student_id (giả định cột ID là cột đầu hoặc theo mapping)
        id_col_name = config.get("mapping", {}).get("id")"""
content = content.replace(old_2, new_2)

# 2. process_test_paper
old_3 = """    # Sync session config
    if excel_filename: _current_session_config["excel_filename"] = excel_filename
    if subject: _current_session_config["subject"] = subject
    if roster_str: _current_session_config["roster_json"] = roster_str"""
new_3 = """    # Sync session config
    config = get_session_config()
    if excel_filename: config["excel_filename"] = excel_filename
    if subject: config["subject"] = subject
    if roster_str: config["roster_json"] = roster_str
    set_session_config(config)"""
content = content.replace(old_3, new_3)

old_4 = """                if res.get('studentId') and res.get('score'):
                    update_excel_score(excel_filename, _current_session_config.get("sheet_name", ""), res['studentId'], res['score'])"""
new_4 = """                if res.get('studentId') and res.get('score'):
                    update_excel_score(excel_filename, config.get("sheet_name", ""), res['studentId'], res['score'])"""
content = content.replace(old_4, new_4)

# 3. upload_roster_excel
old_5 = """        # Update session config
        _current_session_config["excel_filename"] = filename"""
new_5 = """        # Update session config
        config = get_session_config()
        config["excel_filename"] = filename
        set_session_config(config)"""
content = content.replace(old_5, new_5)

# 4. preview_excel
old_6 = """        target_sheet = sheet_name if sheet_name in sheets else sheets[0]
        _current_session_config["sheet_name"] = target_sheet # Save to session"""
new_6 = """        target_sheet = sheet_name if sheet_name in sheets else sheets[0]
        config = get_session_config()
        config["sheet_name"] = target_sheet # Save to session
        set_session_config(config)"""
content = content.replace(old_6, new_6)

# 5. analyze_excel_columns
old_7 = """        _current_session_config["mapping"] = mapping # Save to session"""
new_7 = """        config = get_session_config()
        config["mapping"] = mapping # Save to session
        set_session_config(config)"""
content = content.replace(old_7, new_7)

# 6. reset_system
old_8 = """def reset_system(request):
    global _current_session_config
    _current_session_config = {"excel_filename": None, "subject": None, "roster_json": None, "sheet_name": None, "mapping": {}}
    with _scan_store_lock: _scan_store.clear()
    return Response({"success": True})"""
new_8 = """def reset_system(request):
    set_session_config({"excel_filename": None, "subject": None, "roster_json": None, "sheet_name": None, "mapping": {}})
    return Response({"success": True})"""
content = content.replace(old_8, new_8)

# 7. scan_upload
old_9 = """def scan_upload(request, session_id):
    img_b64 = request.data.get('image_base64', '')
    if img_b64:
        with _scan_store_lock: _scan_store.setdefault(session_id, []).append(img_b64)
        raw_bytes = extract_base64_data(img_b64)
        if raw_bytes:
            filename = f"mobile_{session_id}_{datetime.datetime.now().strftime('%H%M%S_%f')}.jpg"
            save_path = get_backend_root() / 'media' / 'scanned_images' / filename
            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, 'wb') as f: f.write(raw_bytes)

            if _current_session_config["excel_filename"]:
                # Sử dụng ThreadPoolExecutor thay vì threading.Thread trực tiếp
                ai_executor.submit(background_ai_task, filename, _current_session_config.copy(), session_id)"""
new_9 = """def scan_upload(request, session_id):
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
                ai_executor.submit(background_ai_task, filename, config.copy(), session_id)"""
content = content.replace(old_9, new_9)

# 8. scan_poll
old_10 = """def scan_poll(request, session_id):
    with _scan_store_lock: imgs = _scan_store.pop(session_id, [])
    return Response({"images": imgs, "count": len(imgs)})"""
new_10 = """def scan_poll(request, session_id):
    imgs = pop_scan_store(session_id)
    return Response({"images": imgs, "count": len(imgs)})"""
content = content.replace(old_10, new_10)

with open('backend/api/views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done refactoring views.py")
