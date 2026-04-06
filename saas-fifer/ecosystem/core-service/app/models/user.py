from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from shared_libs.python.database import Base
import datetime
import uuid

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "core"}  # Aislamiento en el esquema 'core'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    supabase_id = Column(String, unique=True, index=True, nullable=False) # ID que nos manda Supabase
    email = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
