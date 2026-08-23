from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse
from app.stt import speech_to_text
from app.tts import text_to_speech
from app.translate import translate_text
import shutil

app = FastAPI(title="MedMinds Speech Module - Sarvam AI")

@app.post("/api/voice/transcribe")
async def transcribe(audio: UploadFile = File(...), language_code: str = Form("hi-IN")):
    temp_path = f"temp_{audio.filename}"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(audio.file, f)

    original_text = speech_to_text(temp_path, language_code)
    translated_text = translate_text(original_text, source_lang=language_code, target_lang="en-IN")

    return {
        "language": language_code,
        "original_text": original_text,
        "translated_text": translated_text,
    }

@app.post("/api/translate")
async def translate_endpoint(text: str = Form(...), source_lang: str = Form("hi-IN"), target_lang: str = Form("en-IN")):
    translated = translate_text(text, source_lang, target_lang)
    return {"translated_text": translated}

@app.post("/api/speak")
async def speak(text: str = Form(...), language_code: str = Form("hi-IN")):
    path = text_to_speech(text, language_code, "output.wav")
    return FileResponse(path, media_type="audio/wav")

@app.get("/health")
async def health():
    return {"status": "ok"}