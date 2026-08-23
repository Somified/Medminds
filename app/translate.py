import requests
from app.config import SARVAM_API_KEY

TRANSLATE_URL = "https://api.sarvam.ai/translate"

def translate_text(text: str, source_lang: str = "hi-IN", target_lang: str = "en-IN"):
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "input": text,
        "source_language_code": source_lang,
        "target_language_code": target_lang,
        "model": "mayura:v1",
    }

    response = requests.post(TRANSLATE_URL, headers=headers, json=payload)
    response.raise_for_status()
    result = response.json()
    return result["translated_text"]