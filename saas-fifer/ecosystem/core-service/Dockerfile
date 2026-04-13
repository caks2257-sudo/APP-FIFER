# FIFER core-service — FastAPI para Google Cloud Run
#
# Contexto de build: raíz del monorepo (incluye shared-libs).
#   docker build -f saas-fifer/ecosystem/core-service/Dockerfile .
#
# Secretos: inyectar desde Secret Manager como variables de entorno en Cloud Run
# (mismo criterio que External Bridge vault / JSON en GCP), por ejemplo:
#   DATABASE_URL
#   SUPABASE_URL, SUPABASE_JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY
#   REDIS_URL
#   ELEVENLABS_API_KEY
#   GOOGLE_CLOUD_PROJECT o FIFER_GCP_PROJECT (ADC automática en Cloud Run)
#
# La app no lee .env dentro del contenedor; pydantic-settings usa solo el entorno.

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app:/app/shared-libs/python

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY shared-libs/python /app/shared-libs/python
COPY saas-fifer/ecosystem/core-service/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt

COPY saas-fifer/ecosystem/core-service/app /app/app

RUN adduser --disabled-password --gecos "" --uid 1000 fifer \
    && chown -R fifer:fifer /app

USER fifer

EXPOSE 8080

ENV PORT=8080

# Cloud Run define PORT; localmente por defecto 8080
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
