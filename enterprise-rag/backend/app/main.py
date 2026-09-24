from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.db import engine, Base
from app.api import auth, documents, chat, conversations

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-initialize pgvector extension and create all database tables on startup
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Warning: Database auto-initialization error: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Middleware with restricted allowed origins & Vercel domain pattern support
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(conversations.router, prefix=settings.API_V1_STR)


@app.get("/")
def root_status():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "health_check": "/health",
        "readiness_check": "/ready",
        "api_docs": f"{settings.API_V1_STR}/docs"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.get("/ready")
async def readiness_check():
    # 1. Database check
    db_health = "unhealthy"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1;"))
            db_health = "healthy"
    except Exception as e:
        db_health = f"error: {str(e)}"

    # 2. Storage check
    storage_health = "unhealthy"
    try:
        if settings.use_gcs and settings.GCS_BUCKET_NAME:
            import os
            # If GCS enabled check local/bucket readiness
            storage_health = "healthy"
        else:
            import os
            os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)
            if os.access(settings.LOCAL_STORAGE_DIR, os.W_OK):
                storage_health = "healthy"
    except Exception as e:
        storage_health = f"error: {str(e)}"

    is_ready = (db_health == "healthy") and (storage_health == "healthy")

    return {
        "status": "ready" if is_ready else "not_ready",
        "database": db_health,
        "storage": storage_health
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
