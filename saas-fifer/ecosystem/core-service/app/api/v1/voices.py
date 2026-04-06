from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel
import httpx
import os
import sys

# Asegurar que reconozca shared-libs en la raíz del monorepo
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../../"))
shared_libs_python = os.path.join(root_dir, "shared-libs", "python")
sys.path.insert(0, shared_libs_python)

from config import settings

router = APIRouter()

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"


def _require_elevenlabs_key() -> str:
    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY no está configurada en el .env raíz.")
    return settings.ELEVENLABS_API_KEY


def _require_supabase_config():
    if not settings.SUPABASE_URL:
        raise HTTPException(status_code=500, detail="SUPABASE_URL no está configurada.")
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="SUPABASE_SERVICE_ROLE_KEY no está configurada.")
    return settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY


async def _save_voice_id_for_profile(x_user_id: str, voice_id: str):
    supabase_url, service_key = _require_supabase_config()
    endpoint = f"{supabase_url}/rest/v1/profiles?id=eq.{x_user_id}"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.patch(endpoint, headers=headers, json={"voice_id": voice_id})

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)


class SelectVoiceRequest(BaseModel):
    voice_id: str


@router.get("/voices")
async def list_voices():
    api_key = _require_elevenlabs_key()
    headers = {"xi-api-key": api_key}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{ELEVENLABS_BASE_URL}/voices", headers=headers)

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    payload = response.json()
    voices = payload.get("voices", [])
    cleaned = [
        {
            "voice_id": v.get("voice_id"),
            "name": v.get("name"),
            "preview_url": v.get("preview_url"),
            "category": v.get("category"),
        }
        for v in voices
    ]
    return {"voices": cleaned}


@router.post("/select-voice")
async def select_voice(
    body: SelectVoiceRequest,
    x_user_id: str = Header(..., alias="X-User-Id"),
):
    await _save_voice_id_for_profile(x_user_id, body.voice_id)
    return {"message": "Voz seleccionada y guardada en perfil.", "voice_id": body.voice_id}


@router.post("/clone-voice")
async def clone_voice(
    name: str = Form(...),
    file: UploadFile = File(...),
    x_user_id: str = Header(..., alias="X-User-Id"),
):
    api_key = _require_elevenlabs_key()
    headers = {"xi-api-key": api_key}

    file.file.seek(0)
    files = {
        "files": (
            file.filename or "voice_sample.wav",
            file.file,
            file.content_type or "application/octet-stream",
        )
    }
    form_data = {"name": name}

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{ELEVENLABS_BASE_URL}/voices/add",
            headers=headers,
            data=form_data,
            files=files,
        )

    if response.status_code >= 400:
        detail = response.text
        if response.status_code in (401, 403):
            detail = "ElevenLabs rechazó la clonación. Verifica API key y permisos del plan para Instant Voice Cloning."
        elif response.status_code == 422:
            detail = "ElevenLabs no aceptó el archivo de audio. Revisa formato/calidad del .mp3 o .wav."
        raise HTTPException(status_code=response.status_code, detail=detail)

    payload = response.json()
    voice_id = payload.get("voice_id")
    if not voice_id:
        raise HTTPException(status_code=502, detail="ElevenLabs no devolvió voice_id en la respuesta.")

    await _save_voice_id_for_profile(x_user_id, voice_id)
    return {"message": "Voz clonada y guardada en perfil.", "voice_id": voice_id}
