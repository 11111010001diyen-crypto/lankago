from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth, bookings, places

app = FastAPI(title="LankaGo API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(bookings.router)
app.include_router(places.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}