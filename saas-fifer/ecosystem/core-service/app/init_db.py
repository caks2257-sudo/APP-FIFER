import sys
import os

# Forzar a Python a reconocer la carpeta raíz (para shared_libs) y la carpeta actual (para app)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from shared_libs.python.database import engine, Base
from sqlalchemy import text
from app.models.user import User

def init_db():
    print("Conectando a la base de datos...")
    with engine.connect() as conn:
        # Crear el esquema 'core'
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS core"))
        conn.commit()
        print("Esquema 'core' asegurado.")
    
    # Crear tablas
    Base.metadata.create_all(bind=engine)
    print("Tablas creadas exitosamente.")

if __name__ == "__main__":
    init_db()
