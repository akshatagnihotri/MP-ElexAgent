import os
import re
import json

data_dir = "uploaded_data/form 20 year 2023final data"
output_json = "constituency_index.json"

print(f"Scanning directory '{data_dir}' for constituency Excel sheets...")

# Helper to map districts to major divisions
district_to_division = {
    # Bhopal
    "bhopal": "Bhopal", "sehore": "Bhopal", "vidisha": "Bhopal", "raisen": "Bhopal", "rajgarh": "Bhopal",
    # Indore
    "indore": "Indore", "dhar": "Indore", "jhabua": "Indore", "alirajpur": "Indore", "khargone": "Indore", 
    "barwani": "Indore", "khandwa": "Indore", "burhanpur": "Indore", "buehanpur": "Indore", "khargon": "Indore",
    # Gwalior
    "gwalior": "Gwalior", "datia": "Gwalior", "shivpuri": "Gwalior", "guna": "Gwalior", "ashok nagar": "Gwalior",
    "ashok nagal": "Gwalior", "shivpur": "Gwalior",
    # Jabalpur
    "jabalpur": "Jabalpur", "katni": "Jabalpur", "chhindwara": "Jabalpur", "seoni": "Jabalpur", 
    "mandla": "Jabalpur", "balaghat": "Jabalpur", "dindori": "Jabalpur", "narsinghpur": "Jabalpur",
    # Ujjain
    "ujjain": "Ujjain", "ratlam": "Ujjain", "mandsaur": "Ujjain", "neemuch": "Ujjain", "dewas": "Ujjain", 
    "shajapur": "Ujjain", "agar malwa": "Ujjain",
    # Sagar
    "sagar": "Sagar", "damoh": "Sagar", "chhatarpur": "Sagar", "tikamgarh": "Sagar", "panna": "Sagar",
    "niwari": "Sagar", "tikamgadh": "Sagar",
    # Rewa
    "rewa": "Rewa", "sidhi": "Rewa", "singrauli": "Rewa", "satna": "Rewa", "maihar": "Rewa", 
    "singarauli": "Rewa", "anuppur": "Rewa", "anppar": "Rewa", "umaria": "Rewa", "shahdol": "Rewa",
    # Chambal
    "sheopur": "Chambal", "morena": "Chambal", "bhind": "Chambal"
}

index_data = {}

# Ensure the output directories are correct
if not os.path.exists(data_dir):
    print(f"Error: Directory '{data_dir}' does not exist!")
    exit(1)

files = os.listdir(data_dir)
xlsx_files = [f for f in files if f.endswith(".xlsx") and not f.startswith("~$")]

print(f"Found {len(xlsx_files)} Excel files. Parsing names...")

for filename in xlsx_files:
    # 1. Parse constituency number
    # Try looking for leading digits e.g. "204_indore..." or digits enclosed e.g. "form 20 (198 KUKSHI)"
    num_match = re.search(r'^(\d+)', filename) or re.search(r'\(?\b(\d+)\b\)?', filename)
    con_number = int(num_match.group(1)) if num_match else 0
    
    # 2. Extract names and clean up
    # Remove number, file extension, and year from name for display
    clean_name = filename.replace(".xlsx", "")
    clean_name = re.sub(r'\(?\d+\)?', '', clean_name) # remove numbers
    clean_name = re.sub(r'_\d{4}_?', '', clean_name) # remove years e.g. _2023 or _2025
    clean_name = re.sub(r'-\d{4}-?', '', clean_name)
    clean_name = clean_name.replace("form20", "").replace("FORM20", "").replace("form_20", "")
    clean_name = clean_name.replace("form 20", "").replace("FORM 20", "").replace("final data", "")
    clean_name = clean_name.replace("Copy", "").replace("Autosaved", "")
    
    # Clean up excess separators and capitalizations
    parts = [p.strip() for p in re.split(r'[-_ ()]', clean_name) if p.strip()]
    
    # Identify district/division
    district = "Others"
    for part in parts:
        part_lower = part.lower()
        if part_lower in district_to_division:
            district = part
            break
            
    division = district_to_division.get(district.lower(), "Bhopal") # default fallback
    
    # Reassemble constituency name beautifully
    # Filter out known district or division words to leave only constituency name
    name_parts = []
    for p in parts:
        p_lower = p.lower()
        if p_lower not in district_to_division and p_lower not in ["division", "dist", "district", "final"]:
            name_parts.append(p)
            
    con_name = " ".join(name_parts)
    if not con_name: # fallback
        con_name = " ".join(parts)
        
    con_name = con_name.title().strip()
    
    # Append to active division
    if division not in index_data:
        index_data[division] = []
        
    # Relative path from index.html
    rel_path = f"./uploaded_data/form 20 year 2023final data/{filename}"
    
    # Prevent duplicate constituency numbers
    if not any(x["number"] == con_number for x in index_data[division]):
        index_data[division].append({
            "number": con_number,
            "name": f"{con_number} - {con_name}",
            "file": rel_path
        })

# Sort constituencies inside each division by constituency number
for division in index_data:
    index_data[division].sort(key=lambda x: x["number"])

# Write out the JSON index file
with open(output_json, 'w', encoding='utf-8') as f:
    json.dump(index_data, f, indent=2, ensure_ascii=False)

print(f"\nSuccessfully wrote index of {sum(len(v) for v in index_data.values())} constituencies across {len(index_data)} divisions to '{output_json}'!")
for div, items in index_data.items():
    print(f"- {div} Division: {len(items)} constituencies loaded")
