from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

# Crear el motor de conexion a Postgres (Tildes removidas por seguridad en comentarios)
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

# Crear la fabrica de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base para nuestros modelos de base de datos
Base = declarative_base()

# Dependencia para obtener la sesion de BD en los endpoints de FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
