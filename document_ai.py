import re
import json
from pathlib import Path


# ============================================================
# BASIC TEXT CLEANING
# ============================================================

def clean_text(text):
    """
    Clean OCR output while preserving useful medical information.
    """

    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Fix common OCR spacing problems
    text = re.sub(r"[ \t]+", " ", text)

    # Remove excessive blank lines
    text = re.sub(r"\n\s*\n+", "\n", text)

    # Common OCR corrections for our sample documents
    text = re.sub(r"(?i)\b(\d+)\s*mi\b", r"\1 ml", text)
    text = re.sub(r"(?i)\bVitamin\s+03\b", "Vitamin D3", text)

    text = re.sub(r"(?i)\bHbAlc\b", "HbA1c", text)
    text = re.sub(r"\bulU/mL\b", "uIU/mL", text)
    text = re.sub(r"\bIyer\b", "Iyer", text)
    
    return text.strip()


# ============================================================
# PATIENT INFORMATION
# ============================================================

def extract_patient(text):

    patient = {
        "name": None,
        "age": None,
        "gender": None,
        "date": None,
        "opd_no": None
    }

    # Patient name + date
    match = re.search(
        r"Patient\s*Name\s*:\s*([A-Za-z ]+?)\s+Date\s*:?\s*"
        r"(\d{1,2}/\d{1,2}/\d{4})",
        text,
        re.IGNORECASE
    )

    if match:
        patient["name"] = match.group(1).strip()
        patient["date"] = match.group(2)

    # Age + gender
    match = re.search(
        r"Age\s*/\s*Gender\s*:\s*(\d+)\s*/\s*"
        r"(Male|Female|Other)",
        text,
        re.IGNORECASE
    )

    if match:
        patient["age"] = int(match.group(1))
        patient["gender"] = match.group(2).capitalize()

    # OPD number
    match = re.search(
        r"OPD\s*No\.?\s*:\s*([A-Za-z0-9\/\-]+)",
        text,
        re.IGNORECASE
    )

    if match:
        patient["opd_no"] = match.group(1)

    return patient


# ============================================================
# DOCTOR
# ============================================================

def extract_doctor(text):

    lines = text.splitlines()

    for line in lines:

        line = line.strip()

        # Look for lines containing Dr.
        if "Dr." in line or line.startswith("Dr "):

            # Remove "Dr." and qualifications
            name = re.sub(
                r"^.*?Dr\.?\s*",
                "",
                line,
                flags=re.IGNORECASE
            )

            # Remove qualifications and everything after comma
            name = re.split(
                r",|\bMBBS\b|\bMD\b|\bMS\b|\bDNB\b",
                name,
                flags=re.IGNORECASE
            )[0]

            name = name.strip()

            # Make sure it looks like a name
            if len(name.split()) >= 2:
                return name

    return None
# ============================================================
# MEDICINES
# ============================================================

def extract_medicines(text):

    medicines = []

    # Only use the prescription section
    prescription_match = re.search(
        r"PRESCRIPTION(.*?)(?=\n\s*(?:Dr\.|$))",
        text,
        re.IGNORECASE | re.DOTALL
    )

    if prescription_match:
        section = prescription_match.group(1)
    else:
        section = text

    # Numbered medicine entries
    matches = list(
        re.finditer(
            r"(?m)^\s*(\d+)\.\s*(.+?)\s*$",
            section
        )
    )

    for i, match in enumerate(matches):

        number = int(match.group(1))
        first_line = match.group(2).strip()

        # Recognize common medicine types
        if not re.search(
            r"(?i)\b("
            r"Tab\.?|Tablet|"
            r"Cap\.?|Capsule|"
            r"Syrup|"
            r"Gel|"
            r"Drops?|"
            r"Nasal|"
            r"Injection|"
            r"Inj\.?"
            r")\b",
            first_line
        ):
            continue

        # Medicine block end
        if i + 1 < len(matches):
            end = matches[i + 1].start()
        else:
            end = len(section)

        block = section[match.start():end].strip()
        lines = block.splitlines()

        # Remove number
        medicine_line = re.sub(
            r"^\s*\d+\.\s*",
            "",
            lines[0].strip()
        )

        # -------------------------
        # Duration
        # -------------------------

        duration_match = re.search(
            r"\b(\d+\s*(?:Days?|Weeks?|Months?))\b",
            medicine_line,
            re.IGNORECASE
        )

        duration = (
            duration_match.group(1).strip()
            if duration_match
            else None
        )

        # -------------------------
        # Strength
        # -------------------------

        strength_match = re.search(
            r"\b("
            r"\d[\d,]*(?:\.\d+)?\s*"
            r"(?:mg|mcg|g|ml|IU)"
            r"(?:\s*/\s*"
            r"\d[\d,]*(?:\.\d+)?\s*ml"
            r")?"
            r")\b",
            medicine_line,
            re.IGNORECASE
        )

        strength = (
            strength_match.group(1).strip()
            if strength_match
            else None
        )

        # -------------------------
        # Medicine name
        # -------------------------

        name = medicine_line

        if duration:
            name = name.replace(duration, "")

        if strength:
            name = name.replace(strength, "")

        name = re.sub(r"\s+", " ", name).strip()

        # -------------------------
        # Instructions
        # -------------------------

        instruction_lines = []

        for line in lines[1:]:

            line = line.strip()

            if not line:
                continue

            # Skip accidental numbering
            if re.match(r"^\d+\.", line):
                continue

            # Ignore obvious footer OCR garbage
            if re.match(r"^\d+\)\s*oe", line, re.IGNORECASE):
                continue

            instruction_lines.append(line)

        instructions = " ".join(instruction_lines).strip()

        # Remove common prescription footer text
        footer_patterns = [
            r"\s*Consultation if symptoms persist\..*$",
            r"\s*Complete the full course of medicines\..*$",
            r"\s*Thank you\..*$"
        ]

        for pattern in footer_patterns:
            instructions = re.sub(
                pattern,
                "",
                instructions,
                flags=re.IGNORECASE
            ).strip()

        # Liquid OCR normalization
        instructions = re.sub(
            r"(?i)\b(\d+)\s*mi\b",
            r"\1 ml",
            instructions
        )

        medicines.append({
            "number": number,
            "name": name,
            "strength": strength,
            "duration": duration,
            "instructions": instructions
        })

    return medicines


# ============================================================
# DIAGNOSES
# ============================================================

def extract_diagnoses(text):

    diagnoses = []

    # Look for an explicit diagnosis section
    patterns = [
        r"Diagnosis\s*:\s*(.+)",
        r"Diagnoses\s*:\s*(.+)",
        r"Clinical Diagnosis\s*:\s*(.+)"
    ]

    for pattern in patterns:

        matches = re.findall(
            pattern,
            text,
            re.IGNORECASE
        )

        for item in matches:

            item = item.strip()

            if item:
                diagnoses.append(item)

    return diagnoses

# ============================================================
# MEDICAL TIMELINE
# ============================================================

def build_timeline(patient, medicines, diagnoses, lab_values):

    timeline = []

    date = patient.get("date")

    if not date:
        return timeline

    # Prescription event
    if medicines:

        timeline.append({
            "date": date,
            "event": "Prescription recorded",
            "details": f"{len(medicines)} medicine(s) extracted"
        })

    # Diagnosis event
    for diagnosis in diagnoses:

        timeline.append({
            "date": date,
            "event": "Diagnosis recorded",
            "details": diagnosis
        })

    # Lab event
    if lab_values:

        timeline.append({
            "date": date,
            "event": "Laboratory results recorded",
            "details": f"{len(lab_values)} lab value(s) extracted"
        })

    return timeline


# ============================================================
# MAIN DOCUMENT EXTRACTION
# ============================================================

def detect_document_type(text, medicines, lab_values, diagnoses):

    upper_text = text.upper()

    # Strong text indicators first
    if "LAB REPORT" in upper_text or "LABORATORY" in upper_text:
        return "lab_report"

    if "PRESCRIPTION" in upper_text:
        return "prescription"

    # Then use extracted information
    if lab_values:
        return "lab_report"

    if medicines:
        return "prescription"

    if diagnoses:
        return "medical_report"

    return "medical_document"

# ============================================================
# LAB VALUES
# ============================================================

def extract_lab_values(text):

    lab_values = []

    lines = text.splitlines()

    for line in lines:

        line = line.strip()

        if not line:
            continue

        upper_line = line.upper()

        # Skip headings and metadata
        if any(word in upper_line for word in [
            "LAB REPORT",
            "TEST RESULT",
            "REF. RANGE",
            "REF,RANGE",
            "REFERENCE RANGE",
            "PATIENT NAME",
            "AGE/GENDER",
            "LAB NO",
            "SAMPLE:",
            "FOLLOW UP",
            "THANK YOU"
        ]):
            continue

        # Example:
        # Fasting Glucose 138 mg/dL 70 - 100 HIGH
        # HbA1c 7.20 % 4.00 - 5.60 HIGH
        # Total Cholesterol 205 mg/dL < 200 HIGH

        pattern = re.search(
            r"^(.+?)\s+"
            r"(\d+(?:\.\d+)?)\s+"
            r"([A-Za-z%]+(?:/[A-Za-z]+)?)\s+"
            r"((?:<|>|<=|>=)?\s*\d+(?:\.\d+)?"
            r"(?:\s*-\s*\d+(?:\.\d+)?)?)"
            r"\s*(HIGH|LOW|NORMAL)?$",
            line,
            re.IGNORECASE
        )

        if pattern:

            test_name = pattern.group(1).strip()
            value = pattern.group(2).strip()
            unit = pattern.group(3).strip()
            reference_range = pattern.group(4).strip()
            flag = pattern.group(5)

            if flag:
                flag = flag.upper()

            lab_values.append({
                "test": test_name,
                "value": value,
                "unit": unit,
                "reference_range": reference_range,
                "flag": flag
            })

    return lab_values

# ============================================================
# MAIN DOCUMENT EXTRACTION
# ============================================================

def extract_document(text):

    # Clean OCR text first
    text = clean_text(text)

    # Extract information
    patient = extract_patient(text)
    doctor = extract_doctor(text)

    medicines = extract_medicines(text)
    lab_values = extract_lab_values(text)
    diagnoses = extract_diagnoses(text)

    # Detect document type
    document_type = detect_document_type(
        text,
        medicines,
        lab_values,
        diagnoses
    )

    # Keep only relevant data
    if document_type == "prescription":

        lab_values = []

    elif document_type == "lab_report":

        medicines = []

    # Build timeline
    timeline = build_timeline(
        patient,
        medicines,
        diagnoses,
        lab_values
    )

    return {
        "document_type": document_type,
        "patient": patient,
        "doctor": doctor,
        "medicines": medicines,
        "diagnoses": diagnoses,
        "lab_values": lab_values,
        "timeline": timeline
    }

# ============================================================
# TEST ALL OCR FILES
# ============================================================

# ============================================================
# PROCESS OCR FILES
# ============================================================

output_folder = Path("output")

raw_files = list(output_folder.glob("*_raw.txt"))

print(f"\nFound {len(raw_files)} OCR files.\n")

for file in raw_files:

    print(f"Processing: {file.name}")

    with open(
        file,
        "r",
        encoding="utf-8"
    ) as f:
        text = f.read()

    result = extract_document(text)

    output_file = (
        output_folder /
        f"{file.stem.replace('_raw', '')}_document.json"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            result,
            f,
            indent=4,
            ensure_ascii=False
        )

    print(f"Saved → {output_file}")

print("\n========== DOCUMENT AI COMPLETE ==========")