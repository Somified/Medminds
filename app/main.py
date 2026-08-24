from pydantic import BaseModel, Field

from medikiosk_ai.app import run_medikiosk_turn

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.stt import speech_to_text
from app.tts import text_to_speech
from app.translate import translate_text

import shutil
import os


app = FastAPI(title="MedMinds Speech Module - Sarvam AI")


# ============================================================
# CORS
# Allows the React/Vite frontend to communicate with FastAPI
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# VOICE TRANSCRIPTION
# ============================================================

@app.post("/api/voice/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language_code: str = Form("hi-IN")
):
    temp_path = f"temp_{audio.filename}"

    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(audio.file, f)

        original_text = speech_to_text(
            temp_path,
            language_code
        )

        translated_text = translate_text(
            original_text,
            source_lang=language_code,
            target_lang="en-IN"
        )

        return {
            "language": language_code,
            "original_text": original_text,
            "translated_text": translated_text,
        }

    finally:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass


# ============================================================
# TRANSLATION
# ============================================================

@app.post("/api/translate")
async def translate_endpoint(
    text: str = Form(...),
    source_lang: str = Form("hi-IN"),
    target_lang: str = Form("en-IN")
):
    translated = translate_text(
        text,
        source_lang,
        target_lang
    )

    return {
        "translated_text": translated
    }


# ============================================================
# TEXT TO SPEECH
# ============================================================

@app.post("/api/speak")
async def speak(
    text: str = Form(...),
    language_code: str = Form("hi-IN")
):
    path = text_to_speech(
        text,
        language_code,
        "output.wav"
    )

    return FileResponse(
        path,
        media_type="audio/wav"
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health():
    return {
        "status": "ok"
    }


# ============================================================
# GEMINI CHATBOT INTEGRATION
# ============================================================

class ChatRequest(BaseModel):
    patient_language: str = "Hindi"
    care_system: str = "allopathic"
    patient_age_band: str = "30-40"

    # Conversation sent from React frontend
    conversation_history: list = Field(default_factory=list)


@app.post("/api/chat")
async def chat(request: ChatRequest):

    try:
        result = run_medikiosk_turn(
            patient_language=request.patient_language,
            care_system=request.care_system,
            patient_age_band=request.patient_age_band,
            conversation_history=request.conversation_history,
        )

        return result

    except Exception as e:
        print(f"Gemini Chat Error: {e}")

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )