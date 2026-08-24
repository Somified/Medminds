import os
import re
import json
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Path resolution for system prompt file
PROMPT_FILE = Path(__file__).parent / "system_prompt.txt"

# Load environment variables from medikiosk_ai/.env
load_dotenv(Path(__file__).parent / ".env")


def load_system_prompt() -> str:
    if not PROMPT_FILE.exists():
        return "You are a clinical intake AI assistant."

    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        return f.read()


def parse_ai_response(raw_text: str) -> dict:
    """
    Extracts structured XML tags (<speak>, <options>, <redflag>, <summary>)
    from the AI output into a Python dictionary for the frontend/backend.
    """

    if not isinstance(raw_text, str):
        raw_text = str(raw_text or "")

    result = {
        "speak": "",
        "options": None,
        "redflag": None,
        "summary": None,
        "raw_response": raw_text
    }

    # Extract <speak>
    speak_match = re.search(
        r"<speak>(.*?)</speak>",
        raw_text,
        re.DOTALL | re.IGNORECASE
    )

    if speak_match:
        result["speak"] = speak_match.group(1).strip()

    # Extract <options>
    options_match = re.search(
        r"<options>(.*?)</options>",
        raw_text,
        re.DOTALL | re.IGNORECASE
    )

    if options_match:
        try:
            result["options"] = json.loads(
                options_match.group(1).strip()
            )
        except Exception:
            result["options"] = [
                opt.strip().strip('"')
                for opt in options_match.group(1).split(",")
            ]

    # Extract <redflag>
    redflag_match = re.search(
        r"<redflag>(.*?)</redflag>",
        raw_text,
        re.DOTALL | re.IGNORECASE
    )

    if redflag_match:
        try:
            result["redflag"] = json.loads(
                redflag_match.group(1).strip()
            )
        except Exception:
            result["redflag"] = {
                "triggered": True,
                "reason": "Red flag detected",
                "urgency": "immediate"
            }

    # Extract <summary>
    summary_match = re.search(
        r"<summary>(.*?)</summary>",
        raw_text,
        re.DOTALL | re.IGNORECASE
    )

    if summary_match:
        try:
            result["summary"] = json.loads(
                summary_match.group(1).strip()
            )
        except Exception:
            result["summary"] = {
                "error": "Failed to parse summary JSON"
            }

    return result


def run_medikiosk_turn(
    patient_language: str = "Hindi",
    care_system: str = "allopathic",
    patient_age_band: str = "30-40",
    conversation_history: list = None
) -> dict:
    """
    Executes a single conversational turn using Google Gemini API.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is not set."
        )

    if conversation_history is None:
        conversation_history = []

    # Initialize Gemini client
    client = genai.Client(api_key=api_key)

    system_instruction = load_system_prompt()

    # Configure model parameters for low-variance clinical history taking
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.2
    )

    # Context header passed every turn
    context_header = f"""
SESSION CONTEXT:
- patient_language: {patient_language}
- care_system: {care_system}
- patient_age_band: {patient_age_band}

CONVERSATION HISTORY:
"""

    prompt_body = context_header

    for turn in conversation_history:
        role = turn.get("role", "user").upper()
        content = turn.get("content", "")
        prompt_body += f"{role}: {content}\n"

    # API call to Gemini
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt_body,
        config=config
    )

    parsed_output = parse_ai_response(response.text)

    return parsed_output


if __name__ == "__main__":
    print("Testing MediKiosk AI Engine locally...")

    test_history = [
        {
            "role": "user",
            "content": "Mujhe 2 din se fever hai aur khansi hai"
        }
    ]

    res = run_medikiosk_turn(
        patient_language="Hindi",
        care_system="allopathic",
        patient_age_band="20-30",
        conversation_history=test_history
    )

    print("\n--- PARSED AI RESPONSE ---")
    print(
        json.dumps(
            res,
            indent=2,
            ensure_ascii=False
        )
    )