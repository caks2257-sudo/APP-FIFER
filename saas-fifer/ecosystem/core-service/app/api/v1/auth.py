from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import sys
import os

# Asegurar que reconozca shared_libs
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../')))

from shared_libs.python.database import get_db
from app.models.user import User
from app.schemas.user import UserSyncRequest

router = APIRouter()

@router.post("/sync", status_code=201)
async def sync_supabase_user(user_data: UserSyncRequest, db: Session = Depends(get_db)):
    # 1. Verificar si el usuario ya existe para no duplicarlo
    existing_user = db.query(User).filter(User.supabase_id == user_data.supabase_id).first()
    if existing_user:
        return {"message": "El usuario ya existe", "user_id": str(existing_user.id)}
    
    # 2. Crear el nuevo usuario en Postgres
    new_user = User(
        supabase_id=user_data.supabase_id,
        email=user_data.email
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "Usuario sincronizado exitosamente", "user_id": str(new_user.id)}
