import urllib.request
import urllib.parse
import zipfile
import os
import re

file_id = "1J3FtLrbZI0xAI64mduZxCRdA-7DkA2HD"
output_zip = "drive_data.zip"
extract_dir = "uploaded_data"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
}

try:
    print("Reading downloaded virus scan warning HTML page...")
    with open(output_zip, 'r', encoding='utf-8', errors='ignore') as f:
        html_text = f.read()
        
    # Find form action URL
    action_match = re.search(r'<form\s+[^>]*action="([^"]+)"', html_text)
    if action_match:
        action_url = action_match.group(1)
    else:
        action_url = "https://drive.usercontent.google.com/download"
        
    print(f"Form action URL found: {action_url}")
    
    # Extract all hidden inputs: <input type="hidden" name="xxx" value="yyy">
    input_matches = re.findall(r'<input\s+type="hidden"\s+name="([^"]+)"\s+value="([^"]+)"', html_text)
    
    params = {}
    for name, val in input_matches:
        params[name] = val
        
    print(f"Extracted form parameters: {params}")
    
    if not params:
        print("Error: Could not extract form parameters. Using default fallback...")
        params = {
            "id": file_id,
            "export": "download",
            "confirm": "t"
        }
        
    # Construct final query URL
    query_string = urllib.parse.urlencode(params)
    final_download_url = f"{action_url}?{query_string}"
    
    print(f"Requesting confirmed download from URL: {final_download_url}")
    
    req = urllib.request.Request(final_download_url, headers=headers)
    with urllib.request.urlopen(req) as response:
        content = response.read()
        
    # Overwrite zip with binary content
    with open(output_zip, 'wb') as f:
        f.write(content)
        
    print(f"Confirmed download complete! File size: {os.path.getsize(output_zip)} bytes.")
    
    # Verify if it is a valid zip file before extracting
    if zipfile.is_zipfile(output_zip):
        print("Verified download is a valid ZIP archive. Extracting...")
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(output_zip, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        print(f"Successfully extracted all files to directory: {extract_dir}!")
        
        # List extracted files recursively
        print("\n--- Extracted Files ---")
        for root, dirs, files in os.walk(extract_dir):
            for name in files:
                rel_path = os.path.relpath(os.path.join(root, name), extract_dir)
                size = os.path.getsize(os.path.join(root, name))
                print(f"- {rel_path} ({size} bytes)")
    else:
        print("Error: The downloaded confirmed file is still not a valid ZIP file. Showing first 200 bytes:")
        with open(output_zip, 'r', encoding='utf-8', errors='ignore') as f:
            print(f.read()[:200])
            
except Exception as e:
    print(f"An error occurred: {e}")
