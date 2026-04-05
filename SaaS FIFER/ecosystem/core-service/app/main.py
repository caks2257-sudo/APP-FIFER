from fastapi import FastAPI
from app.api.v1 import auth

app = FastAPI(title="FIFER Core Service", version="1.0.0")

# Conectar el router de autenticación
app.include_router(auth.router, prefix="/api/v1/core/auth", tags=["Auth"])

@app.get("/api/v1/core/health")
async def health_check():
    return {"status": "online", "service": "core-service", "db_status": "connected"}
