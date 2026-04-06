from pydantic import BaseModel

class UserSyncRequest(BaseModel):
    supabase_id: str
    email: str
