from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "FIFER Ecosystem"
    
    # Base de Datos
    DATABASE_URL: str
    
    # Supabase Auth
    SUPABASE_URL: str
    SUPABASE_JWT_SECRET: str
    
    # Event Bus (Redis)
    REDIS_URL: str

    # Lee automaticamente el archivo .env
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

# Instancia global para usar en cualquier microservicio
settings = Settings()
