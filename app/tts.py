import requests
import base64
from app.config import SARVAM_API_KEY

TTS_URL = "https://api.sarvam.ai/text-to-speech"

def text_to_speech(text: str, language_code: str = "hi-IN", output_path: str = "output.wav"):
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": [text],
        "target_language_code": language_code,
        "speaker": "meera",
        "model": "bulbul:v1",
    }

    response = requests.post(TTS_URL, headers=headers, json=payload)
    response.raise_for_status()
    result = response.json()

    audio_b64 = result["audios"][0]
    audio_bytes = base64.b64decode(audio_b64)

    with open(output_path, "wb") as f:
        f.write(audio_bytes)
    return output_path