from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.core.database import verify_database_connectivity
from app.core.config import settings
from app.api.v1.router import api_router
from app.services.bootstrap import init_db_and_seed

logger = logging.getLogger("bytevipers")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Safe database connectivity check
    db_info = await verify_database_connectivity()
    logger.info(f"Database connected successfully. Dialect: {db_info['dialect']}, Driver: {db_info['driver']}")
    # Initialize database schema and seeds
    await init_db_and_seed()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="ByteVipers Coding Arena — Python-only coding practice & assessment platform. Think. Code. Conquer.",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    try:
        db_info = await verify_database_connectivity()
        db_status = "connected"
        dialect = db_info.get("dialect")
    except Exception as e:
        db_status = "unhealthy"
        dialect = "unknown"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "tagline": settings.TAGLINE,
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": db_status,
            "dialect": dialect,
        }
    }

app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
