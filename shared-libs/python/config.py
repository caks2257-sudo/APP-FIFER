from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT_DIR / ".env"

# Cargamos el .env del monorepo antes de construir Settings().
load_dotenv(ENV_PATH)

class Settings(BaseSettings):
    PROJECT_NAME: str = "FIFER Ecosystem"
    
    # Base de Datos
    DATABASE_URL: str = "sqlite:///./dev.db"
    
    # Supabase Auth
    SUPABASE_URL: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    ELEVENLABS_API_KEY: Optional[str] = None
    
    # Event Bus (Redis)
    REDIS_URL: Optional[str] = None

    # Lee explícitamente el .env raíz del monorepo.
    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )

# Instancia global para usar en cualquier microservicio
settings = Settings()
