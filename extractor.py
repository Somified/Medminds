import re
import json
from pathlib import Path


def normalize_text(text):
    """
    Conservative OCR cleanup.
    """

    # Normalize common OCR errors in our sample prescriptions
    text = re.sub(r"(?i)\b(\d+)\s*mi\b", r"\1 ml", text)

    # Vitamin 03 -> Vitamin D3
    text = re.sub(r"(?i)\bVitamin\s+03\b", "Vitamin D3", text)

    # lyer -> Iyer when it appears after a doctor name
    text = re.sub(r"(?i)(Dr\.\s*Sneha)\s+lyer\b", r"\1 Iyer", text)

    return text


def extract_patient_info(text):
    data = {
        "patient_name": None,
        "date": None,
        "age": None,
        "gender": None,
        "opd_no": None,
        "doctor": None
    }

    # Doctor name
    doctor_match = re.search(
        r"\bDr\.?\s*([A-Za-z]+(?:\s+[A-Za-z]+)+)\s*,\s*(?:MBBS|MD|DNB)\b",
        text,
        re.IGNORECASE
    )

    if doctor_match:
        data["doctor"] = doctor_match.group(1).strip()

    # Patient + date
    patient_match = re.search(
        r"Patient\s*Name\s*:\s*([A-Za-z ]+?)\s+Date\s*:?\s*(\d{1,2}/\d{1,2}/\d{4})",
        text,
        re.IGNORECASE
    )

    if patient_match:
        data["patient_name"] = patient_match.group(1).strip()
        data["date"] = patient_match.group(2)

    # Age / Gender
    age_gender_match = re.search(
        r"Age\s*/\s*Gender\s*:\s*(\d+)\s*/\s*(Male|Female|Other)",
        text,
        re.IGNORECASE
    )

    if age_gender_match:
        data["age"] = int(age_gender_match.group(1))
        data["gender"] = age_gender_match.group(2).capitalize()

    # OPD
    opd_match = re.search(
        r"OPD\s*No\.?\s*:\s*([A-Za-z0-9\/\-]+)",
        text,
        re.IGNORECASE
    )

    if opd_match:
        data["opd_no"] = opd_match.group(1)

    return data


def extract_medicines(text):
    """
    Extract numbered medicine entries from one prescription section.
    """

    # Only work with the prescription section
    prescription_match = re.search(
        r"PRESCRIPTION(.*?)(?=\n\s*(?:Dr\.|$))",
        text,
        re.IGNORECASE | re.DOTALL
    )

    if prescription_match:
        section = prescription_match.group(1)
    else:
        section = text

    # Find medicine lines such as:
    # 1. Tab. Paracetamol 500 mg 5 Days
    # 2. Gel Clindamycin 7 Days
    # 3. Tab. Vitamin C 500 mg 30 Days
    medicine_matches = list(
        re.finditer(
            r"(?m)^\s*(\d+)\.\s*(.+?)\s*$",
            section
        )
    )

    medicines = []

    for i, match in enumerate(medicine_matches):

        number = int(match.group(1))
        medicine_line = match.group(2).strip()

        # Make sure this looks like a medicine entry
        if not re.search(
            r"(?i)\b("
            r"Tab\.?|Tablet|"
            r"Cap\.?|Capsule|"
            r"Syrup|"
            r"Gel|"
            r"Drops?|"
            r"Nasal|"
            r"Injection|Inj\.?"
            r")\b",
            medicine_line
        ):
            continue

        # Determine end of this medicine block
        if i + 1 < len(medicine_matches):
            end = medicine_matches[i + 1].start()
        else:
            end = len(section)

        block = section[match.start():end].strip()
        lines = block.splitlines()

        # First line = medicine information
        medicine_line = re.sub(
            r"^\s*\d+\.\s*",
            "",
            lines[0].strip()
        )

        # ---------------------------------------
        # Duration
        # ---------------------------------------

        duration_match = re.search(
            r"\b(\d+\s*(?:Days?|Weeks?|Months?))\b",
            medicine_line,
            re.IGNORECASE
        )

        duration = None

        if duration_match:
            duration = duration_match.group(1).strip()

        # ---------------------------------------
        # Strength
        # ---------------------------------------

        strength_match = re.search(
            r"\b("
            r"\d[\d,]*(?:\.\d+)?\s*"
            r"(?:mg|mcg|g|IU)"
            r"(?:\s*/\s*"
            r"\d[\d,]*(?:\.\d+)?\s*ml"
            r")?"
            r")\b",
            medicine_line,
            re.IGNORECASE
        )

        strength = None

        if strength_match:
            strength = strength_match.group(1).strip()

        # ---------------------------------------
        # Medicine name
        # ---------------------------------------

        name = medicine_line

        if duration:
            name = name.replace(duration, "")

        if strength:
            name = name.replace(strength, "")

        name = re.sub(r"\s+", " ", name).strip()

        # ---------------------------------------
        # Instructions
        # ---------------------------------------

        instructions = []

        for line in lines[1:]:
            line = line.strip()

            if not line:
                continue

            # Ignore accidental OCR numbering
            if re.match(r"^\d+\.", line):
                continue

            instructions.append(line)

        instruction_text = " ".join(instructions).strip()

        # ---------------------------------------
        # Fix common liquid-measure OCR
        # ---------------------------------------

        instruction_text = re.sub(
            r"(?i)\b(\d+)\s*mi\b",
            r"\1 ml",
            instruction_text
        )

        strength = re.sub(
            r"(?i)\b(\d+)\s*mi\b",
            r"\1 ml",
            strength
        ) if strength else strength

        medicines.append({
            "number": number,
            "name": name,
            "strength": strength,
            "duration": duration,
            "instructions": instruction_text
        })

    return medicines

def extract_prescription(text):

    text = normalize_text(text)

    patient_info = extract_patient_info(text)
    medicines = extract_medicines(text)

    return {
        **patient_info,
        "medicines": medicines
    }


def process_file(input_file):

    input_file = Path(input_file)

    with open(input_file, "r", encoding="utf-8") as file:
        text = file.read()

    result = extract_prescription(text)

    output_file = input_file.with_name(
        input_file.stem.replace("_raw", "") + "_structured.json"
    )

    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(
            result,
            file,
            indent=4,
            ensure_ascii=False
        )

    print(f"Structured output saved → {output_file}")


if __name__ == "__main__":

    output_folder = Path("output")

    raw_files = list(output_folder.glob("*_raw.txt"))

    print(f"\nFound {len(raw_files)} OCR files.\n")

    for file in raw_files:
        print(f"Processing: {file.name}")
        process_file(file)

    print("\n========== EXTRACTION COMPLETE ==========")