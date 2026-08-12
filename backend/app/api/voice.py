"""IBM Watson Speech proxy endpoints for LunaGuard Copilot.

Secrets stay on the backend. When Watson Speech is not configured the frontend
falls back to the browser's local speech-recognition/synthesis capabilities.
"""
from __future__ import annotations

from typing import Literal

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.core.config import get_settings

router = APIRouter(prefix="/api/voice", tags=["voice"])

VOICE_MAP = {
    "luna": "en-US_AllisonV3Voice",
    "atlas": "en-US_MichaelV3Voice",
}


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    voice: Literal["luna", "atlas"] = "luna"


@router.get("/status")
async def voice_status() -> dict[str, object]:
    settings = get_settings()
    return {
        "provider": "IBM Watson Speech",
        "tts_enabled": settings.watson_tts_enabled,
        "stt_enabled": settings.watson_stt_enabled,
        "tts_mode": "ibm-watson" if settings.watson_tts_enabled else "browser-fallback",
        "stt_mode": "ibm-watson" if settings.watson_stt_enabled else "browser-fallback",
        "voices": [
            {"id": "luna", "label": "Luna · feminine", "ibm_voice": VOICE_MAP["luna"]},
            {"id": "atlas", "label": "Atlas · masculine", "ibm_voice": VOICE_MAP["atlas"]},
        ],
        "fallback": "browser-web-speech",
    }


@router.post("/tts")
async def text_to_speech(request: TtsRequest) -> Response:
    settings = get_settings()
    if not settings.watson_tts_enabled:
        raise HTTPException(status_code=503, detail="IBM Watson Text to Speech is not configured")

    url = f"{settings.watson_tts_url.rstrip('/')}/v1/synthesize"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(25.0)) as client:
            upstream = await client.post(
                url,
                params={"voice": VOICE_MAP[request.voice]},
                auth=httpx.BasicAuth("apikey", settings.watson_tts_api_key or ""),
                headers={"Accept": "audio/mpeg", "Content-Type": "application/json"},
                json={"text": request.text},
            )
            upstream.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="IBM Watson Text to Speech request failed") from exc

    return Response(
        content=upstream.content,
        media_type=upstream.headers.get("content-type", "audio/mpeg"),
        headers={"Cache-Control": "no-store"},
    )


@router.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)) -> dict[str, object]:
    settings = get_settings()
    if not settings.watson_stt_enabled:
        raise HTTPException(status_code=503, detail="IBM Watson Speech to Text is not configured")

    payload = await audio.read()
    if not payload:
        raise HTTPException(status_code=400, detail="No audio was received")
    if len(payload) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio clip is too large")

    url = f"{settings.watson_stt_url.rstrip('/')}/v1/recognize"
    content_type = audio.content_type or "audio/webm"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(35.0)) as client:
            upstream = await client.post(
                url,
                params={"smart_formatting": "true"},
                auth=httpx.BasicAuth("apikey", settings.watson_stt_api_key or ""),
                headers={"Content-Type": content_type, "Accept": "application/json"},
                content=payload,
            )
            upstream.raise_for_status()
            data = upstream.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="IBM Watson Speech to Text request failed") from exc

    transcripts: list[str] = []
    confidence_values: list[float] = []
    for result in data.get("results", []):
        alternatives = result.get("alternatives") or []
        if not alternatives:
            continue
        best = alternatives[0]
        text = str(best.get("transcript") or "").strip()
        if text:
            transcripts.append(text)
        confidence = best.get("confidence")
        if isinstance(confidence, (int, float)):
            confidence_values.append(float(confidence))

    transcript = " ".join(transcripts).strip()
    return {
        "transcript": transcript,
        "confidence": (sum(confidence_values) / len(confidence_values)) if confidence_values else None,
        "provider": "IBM Watson Speech to Text",
    }
