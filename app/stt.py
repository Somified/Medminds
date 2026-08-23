import requests
from app.config import SARVAM_API_KEY

STT_URL = "https://api.sarvam.ai/speech-to-text"

def speech_to_text(audio_file_path: str, language_code: str = "hi-IN"):
    headers = {"api-subscription-key": SARVAM_API_KEY}

    with open(audio_file_path, "rb") as audio_file:
        files = {"file": (audio_file_path, audio_file, "audio/wav")}
        data = {
            "language_code": language_code,
            "model": "saarika:v2.5",
        }
        response = requests.post(STT_URL, headers=headers, files=files, data=data)
        print("Sarvam status:", response.status_code)
        print("Sarvam response:", response.text)


    response.raise_for_status()
    result = response.json()
    return result["transcript"]