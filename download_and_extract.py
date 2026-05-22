import urllib.request
import zipfile
import os
import re

file_id = "1J3FtLrbZI0xAI64mduZxCRdA-7DkA2HD"
output_zip = "drive_data.zip"
extract_dir = "uploaded_data"

print(f"Constructing download request for Google Drive File ID: {file_id}...")

# Standard Google Drive direct download link
url = f"https://docs.google.com/uc?export=download&id={file_id}"

# Set user-agent to mimic a browser, which helps bypass basic bot blocks on drive downloads
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
}

req = urllib.request.Request(url, headers=headers)

try:
    print("Downloading file from Google Drive... Please wait, this may take a moment depending on the size.")
    with urllib.request.urlopen(req) as response:
        # Check if there is a redirect or a confirmation page
        content = response.read()
        
        # Check if we got an HTML confirmation page (common for larger Google Drive files)
        if b"confirm=" in content:
            print("Detected Google Drive virus scan warning redirect. Resolving confirmation token...")
            html_text = content.decode('utf-8', errors='ignore')
            # Extract confirmation code using regex
            match = re.search(r'confirm=([A-Za-z0-9_]+)', html_text)
            if match:
                confirm_code = match.group(1)
                confirm_url = f"https://docs.google.com/uc?export=download&confirm={confirm_code}&id={file_id}"
                print(f"Requesting direct confirmed download...")
                confirm_req = urllib.request.Request(confirm_url, headers=headers)
                with urllib.request.urlopen(confirm_req) as confirm_response:
                    content = confirm_response.read()
            else:
                print("Failed to parse confirmation code. Writing raw HTML received (might be small file).")
        
        # Save zip content
        with open(output_zip, 'wb') as f:
            f.write(content)
            
    print(f"Successfully downloaded zip file to {output_zip} (Size: {os.path.getsize(output_zip)} bytes).")
    
    # Extract zip file
    print("Extracting zip contents...")
    os.makedirs(extract_dir, exist_ok=True)
    with zipfile.ZipFile(output_zip, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
        
    print(f"Successfully extracted all files to directory: {extract_dir}!")
    
    # List extracted files recursively
    print("\n--- Extracted Files ---")
    file_count = 0
    for root, dirs, files in os.walk(extract_dir):
        for name in files:
            file_count += 1
            rel_path = os.path.relpath(os.path.join(root, name), extract_dir)
            size = os.path.getsize(os.path.join(root, name))
            print(f"- {rel_path} ({size} bytes)")
            
    if file_count == 0:
        print("Warning: No files were extracted. Check if the download URL was blocked or redirected.")
        
except Exception as e:
    print(f"An error occurred during download or extraction: {e}")
