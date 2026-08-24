import cv2
import pytesseract
from pathlib import Path
import json

from document_ai import extract_document


# Path to Tesseract
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def preprocess_image(image_path):

    image = cv2.imread(str(image_path))

    if image is None:
        raise FileNotFoundError(
            f"Could not read image: {image_path}"
        )

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    enlarged = cv2.resize(
        gray,
        None,
        fx=2,
        fy=2,
        interpolation=cv2.INTER_CUBIC
    )

    blurred = cv2.GaussianBlur(
        enlarged,
        (3, 3),
        0
    )

    processed = cv2.threshold(
        blurred,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )[1]

    return processed


def ocr_image(image_path):

    processed = preprocess_image(image_path)

    text = pytesseract.image_to_string(
        processed,
        config="--psm 6"
    )

    return text.strip()


def main():

    samples_folder = Path("samples")
    output_folder = Path("output")

    output_folder.mkdir(exist_ok=True)

    extensions = {
        ".png",
        ".jpg",
        ".jpeg"
    }

    images = [
        file
        for file in samples_folder.iterdir()
        if file.suffix.lower() in extensions
    ]

    print(f"\nFound {len(images)} document(s).\n")

    for image_path in images:

        print(f"Processing: {image_path.name}")

        try:

            # OCR
            raw_text = ocr_image(image_path)

            # Save raw OCR text
            raw_file = (
                output_folder /
                f"{image_path.stem}_raw.txt"
            )

            with open(
                raw_file,
                "w",
                encoding="utf-8"
            ) as file:

                file.write(raw_text)

            # Extract structured data
            document_data = extract_document(
                raw_text
            )

            # Save JSON
            json_file = (
                output_folder /
                f"{image_path.stem}_document.json"
            )

            with open(
                json_file,
                "w",
                encoding="utf-8"
            ) as file:

                json.dump(
                    document_data,
                    file,
                    indent=4,
                    ensure_ascii=False
                )

            print(
                f"  Raw text → {raw_file.name}"
            )

            print(
                f"  JSON → {json_file.name}\n"
            )

        except Exception as error:

            print(
                f"ERROR processing "
                f"{image_path.name}: {error}\n"
            )

    print("========== PROCESSING COMPLETE ==========")


if __name__ == "__main__":
    main()