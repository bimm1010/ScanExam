import requests
import base64
import os

API_BASE = "http://127.0.0.1:8000/api"

def test_ai_flow():
    print("🔬 Testing AI Flow & Excel Persistence...")
    
    # 1. Identify a roster file
    roster_dir = "./media/rosters"
    if not os.path.exists(roster_dir):
        print(f"❌ Roster directory {roster_dir} not found.")
        return
    
    rosters = [f for f in os.listdir(roster_dir) if f.endswith('.xlsx')]
    if not rosters:
        print("❌ No roster files found.")
        return
    
    # Use the one that seems to be the active one based on the filename or just the first one
    roster_filename = rosters[0]
    print(f"📄 Using roster: {roster_filename}")

    # 2. Use a real image from the server
    image_dir = "./media/scanned_images"
    real_images = [f for f in os.listdir(image_dir) if f.startswith('scan_') and os.path.getsize(os.path.join(image_dir, f)) > 1000]
    
    if not real_images:
        print("❌ No real images found to test.")
        return
        
    image_path = os.path.join(image_dir, real_images[0])
    print(f"📸 Using real image for test: {image_path}")
    
    with open(image_path, "rb") as image_file:
        img_base64 = base64.b64encode(image_file.read()).decode('utf-8')
        img_data = f"data:image/jpeg;base64,{img_base64}"
    
    # Mock roster payload (obtained from previous knowledge/roster logs)
    # We will use the roster that the AI is expected to match against.
    # The backend will load the actual roster from the Excel file anyway if it finds the studentId.
    mock_roster = [
        {"id": "STUDENT_001", "name": "Nguyễn Văn Test"},
        {"id": "0139357917", "name": "Nguyễn Văn A"} # Known ID from previous sessions
    ]

    payload = {
        "image_data_list": [img_data],
        "expected_subject": "Tiếng việt",
        "excel_filename": roster_filename,
        "mapping_config": {
            "idCol": 1,
            "nameCol": 2,
            "scoreCol": 3,
            "levelCol": 4,
            "headerRow": 1
        },
        "roster": mock_roster
    }

    try:
        print(f"📡 Sending request to {API_BASE}/process-test-paper/...")
        res = requests.post(f"{API_BASE}/process-test-paper/", json=payload, timeout=30)
        print(f"📥 Response Code: {res.status_code}")
        if res.status_code == 200:
            print("✅ AI Processing Success")
            
            # 3. Test Download Endpoint
            print(f"📡 Testing Download: {API_BASE}/download-updated-excel/?filename={roster_filename}")
            download_res = requests.get(f"{API_BASE}/download-updated-excel/", params={"filename": roster_filename}, timeout=30)
            print(f"📥 Download Response Code: {download_res.status_code}")
            
            if download_res.status_code == 200:
                output_path = "test_downloaded_result.xlsx"
                with open(output_path, "wb") as f:
                    f.write(download_res.content)
                print(f"✅ Downloaded file saved to: {output_path} ({len(download_res.content)} bytes)")
            else:
                print(f"❌ Download Failed: {download_res.text}")
        else:
            print(f"❌ Failed: {res.text}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_ai_flow()
