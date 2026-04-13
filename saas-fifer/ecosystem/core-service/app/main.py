import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth
from app.api.v1 import voices

app = FastAPI(title="FIFER Core Service", version="1.0.0")

# CORS — front (Vercel) llama directo a Cloud Run con NEXT_PUBLIC_FIFER_API_BASE.
# FIFER_CORS_ORIGINS: lista separada por comas, o "*" para permitir cualquier origen (sin credenciales en navegador).
_raw_cors = os.getenv("FIFER_CORS_ORIGINS", "*").strip()
_cors_origins = [o.strip() for o in _raw_cors.split(",") if o.strip()]
_use_star = len(_cors_origins) == 1 and _cors_origins[0] == "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins if _cors_origins else ["*"],
    allow_credentials=not _use_star,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Conectar el router de autenticación
app.include_router(auth.router, prefix="/api/v1/core/auth", tags=["Auth"])
app.include_router(voices.router, prefix="/api/v1/core", tags=["Voices"])

@app.get("/api/v1/core/health")
async def health_check():
    return {"status": "online", "service": "core-service", "db_status": "connected"}
