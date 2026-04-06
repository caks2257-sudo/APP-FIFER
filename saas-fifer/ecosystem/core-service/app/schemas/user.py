from pydantic import BaseModel

class UserSyncRequest(BaseModel):
    supabase_id: str
    email: str


class VoiceSelectionRequest(BaseModel):
    supabase_id: str
    voice_id: str
