import sys
import os

# Forzar a Python a reconocer la carpeta raíz (para shared-libs) y la carpeta actual (para app)
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../'))
shared_libs_python = os.path.join(root_dir, 'shared-libs', 'python')
sys.path.insert(0, shared_libs_python)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from database import engine, Base
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
