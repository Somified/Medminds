import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime


def parse_date(date_str):
    """Convert DD/MM/YYYY string to a sortable date object."""
    try:
        return datetime.strptime(date_str, "%d/%m/%Y")
    except (ValueError, TypeError):
        return datetime.min  # unparseable/missing dates sort first


# ============================================================
# SETTINGS
# ============================================================

output_folder = Path("output")

# Find all generated document JSON files
json_files = list(output_folder.glob("*_document.json"))

print(f"\nFound {len(json_files)} document JSON files.\n")


# ============================================================
# GROUP DOCUMENTS BY PATIENT
# ============================================================

patients = defaultdict(list)

for file in json_files:

    with open(file, "r", encoding="utf-8") as f:
        document = json.load(f)

    patient_name = document.get("patient", {}).get("name")

    # Skip documents without a patient name
    if not patient_name:
        print(f"Skipping {file.name} - patient name not found")
        continue

    patients[patient_name].append(document)


# ============================================================
# CREATE COMBINED PATIENT TIMELINES
# ============================================================

combined_patients = []

for patient_name, documents in patients.items():

    print(f"Processing patient: {patient_name}")

    # Use patient information from the first document
    patient_info = documents[0]["patient"]

    combined_timeline = []

    # Collect timeline events from every document
    for document in documents:

        for event in document.get("timeline", []):
            combined_timeline.append(event)

    # Sort timeline chronologically (not as plain strings)
    combined_timeline.sort(
        key=lambda event: parse_date(event.get("date"))
    )

    combined_patients.append({
        "patient": patient_info,
        "timeline": combined_timeline
    })


# ============================================================
# SAVE COMBINED TIMELINES
# ============================================================

output_file = output_folder / "combined_patient_timelines.json"

with open(output_file, "w", encoding="utf-8") as f:

    json.dump(
        combined_patients,
        f,
        indent=4,
        ensure_ascii=False
    )


print("\n========== TIMELINE MERGING COMPLETE ==========")
print(f"Saved -> {output_file}")