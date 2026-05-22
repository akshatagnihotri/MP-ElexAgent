import csv
import random

# Madhya Pradesh Election 2023 - Bhopal Madhya Constituency Mock Form 20 Generator
filename = "mock_form_20_bhopal_madhya.csv"

# Real-world candidate listings & booth-wise structures
candidates = {
    "BJP_DHRUV_NARAYAN_SINGH": "Dhruv Narayan Singh (BJP)",
    "INC_ARIF_MASOOD": "Arif Masood (INC)",
    "BSP_SHAILENDRA_SHRIVASTAVA": "Shailendra Shrivastava (BSP)",
    "IND_KAPIL_SHARMA": "Kapil Sharma (IND)",
    "NOTA": "NOTA"
}

booth_names_templates = [
    "Government Primary School Building, Room No 1, {}",
    "Government Girls High School, East Wing, {}",
    "Sanjay Gandhi Memorial School, Room No 3, {}",
    "Municipal Corporation Office, Community Hall, {}",
    "Anganwadi Kendra Center, Room 1, {}",
    "Government Excellence School, Main Hall, {}",
    "Navin High School, Northern Building, {}",
    "Subhash Higher Secondary School, Left Wing, {}"
]

neighborhoods = [
    "Jahangirabad", "Aishbagh", "Chola", "Kamla Nagar", "Koh-e-Fiza", 
    "Arera Colony", "MP Nagar", "Habibganj", "Shivaji Nagar", "Bairagarh"
]

print(f"Generating mock Form 20 dataset for Bhopal Madhya constituency in {filename}...")

with open(filename, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    
    # Form 20 Header formatting similar to Election Commission files
    writer.writerow(["FORM 20", "FINAL RESULT SHEET", "ELECTION TO THE LEGISLATIVE ASSEMBLY 2023", "MADHYA PRADESH"])
    writer.writerow(["Constituency: Bhopal Madhya (153)", "Total Polling Stations: 160"])
    writer.writerow([])
    
    # Data columns headers
    headers = [
        "Polling Station No.",
        "Name of Polling Station",
        "Dhruv Narayan Singh (BJP)",
        "Arif Masood (INC)",
        "Shailendra Shrivastava (BSP)",
        "Kapil Sharma (IND)",
        "NOTA",
        "Total Valid Votes Polled",
        "Rejected Votes",
        "Tendered Votes"
    ]
    writer.writerow(headers)
    
    # Seed for reproducibility and generating a realistic close race with INC leading slightly
    random.seed(42)
    
    # Accumulators for validation check
    total_bjp = 0
    total_inc = 0
    total_votes = 0
    
    for i in range(1, 161):
        booth_template = random.choice(booth_names_templates)
        neighborhood = neighborhoods[(i - 1) % len(neighborhoods)]
        booth_name = booth_template.format(neighborhood)
        
        # Generate votes distribution representing a typical voter turn-out per booth (usually 600 - 1200 votes)
        booth_total = random.randint(650, 1150)
        
        # Simulating realistic political leanings in neighborhood clusters:
        # e.g., Jahangirabad leans strongly towards INC, Arera Colony leans strongly BJP
        if neighborhood in ["Jahangirabad", "Aishbagh", "Chola"]:
            bjp_share = random.uniform(0.30, 0.42)
            inc_share = random.uniform(0.50, 0.62)
        elif neighborhood in ["Arera Colony", "MP Nagar", "Habibganj"]:
            bjp_share = random.uniform(0.52, 0.65)
            inc_share = random.uniform(0.30, 0.40)
        else: # swing areas
            bjp_share = random.uniform(0.42, 0.48)
            inc_share = random.uniform(0.43, 0.49)
            
        bsp_share = random.uniform(0.02, 0.06)
        ind_share = random.uniform(0.01, 0.04)
        nota_share = random.uniform(0.005, 0.015)
        
        # Normalize percentages
        total_share = bjp_share + inc_share + bsp_share + ind_share + nota_share
        bjp_votes = int((bjp_share / total_share) * booth_total)
        inc_votes = int((inc_share / total_share) * booth_total)
        bsp_votes = int((bsp_share / total_share) * booth_total)
        ind_votes = int((ind_share / total_share) * booth_total)
        nota_votes = int((nota_share / total_share) * booth_total)
        
        # Adjust total mathematically
        valid_polled = bjp_votes + inc_votes + bsp_votes + ind_votes + nota_votes
        rejected = random.randint(0, 3)
        tendered = random.randint(0, 1)
        
        writer.writerow([
            i,
            booth_name,
            bjp_votes,
            inc_votes,
            bsp_votes,
            ind_votes,
            nota_votes,
            valid_polled,
            rejected,
            tendered
        ])
        
        total_bjp += bjp_votes
        total_inc += inc_votes
        total_votes += valid_polled
        
    # Append EC-style Total row
    writer.writerow([
        "TOTAL",
        "Grand Constituency Totals",
        total_bjp,
        total_inc,
        sum(int((random.uniform(0.02, 0.06)/1.1) * 800) for _ in range(160)), # approximate total others
        sum(int((random.uniform(0.01, 0.04)/1.1) * 800) for _ in range(160)),
        sum(int((random.uniform(0.005, 0.015)/1.1) * 800) for _ in range(160)),
        total_votes,
        random.randint(50, 150),
        random.randint(5, 15)
    ])

print(f"Dataset successfully written! Total Votes: {total_votes}, BJP: {total_bjp}, INC: {total_inc}.")
if total_inc > total_bjp:
    print(f"INC wins the constituency by a margin of {total_inc - total_bjp} votes!")
else:
    print(f"BJP wins the constituency by a margin of {total_bjp - total_inc} votes!")
