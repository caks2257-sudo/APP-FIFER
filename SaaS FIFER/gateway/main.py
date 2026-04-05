from fastapi import FastAPI

app = FastAPI(title="FIFER Gateway", version="1.0.0")

@app.get("/api/v1/health")
async def health_check():
    return {"status": "online", "service": "gateway", "message": "Gateway operativo"}
