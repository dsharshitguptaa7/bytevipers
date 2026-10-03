from typing import AsyncGenerator, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from app.core.config import settings

# Engine configuration
engine_kwargs: Dict[str, Any] = {
    "echo": False,
    "future": True,
    "connect_args": settings.database_connect_args,
}

# Apply connection pool tuning for production PostgreSQL
if not settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
    })

engine = create_async_engine(
    settings.async_database_url,
    **engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def verify_database_connectivity() -> Dict[str, Any]:
    """
    Safely verifies database connectivity and returns dialect and driver information.
    Ensures that NO sensitive credentials or connection strings are logged or returned.
    Never falls back to SQLite if a PostgreSQL connection fails.
    """
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            scalar = result.scalar()
            if scalar != 1:
                raise RuntimeError("Database query did not return expected validation result.")

        return {
            "status": "connected",
            "dialect": engine.dialect.name,
            "driver": engine.dialect.driver,
        }
    except Exception as e:
        # Sanitize error message to prevent accidental exposure of connection strings or credentials
        error_type = type(e).__name__
        safe_msg = f"Database connectivity check failed for dialect '{engine.dialect.name}': {error_type}"
        raise ConnectionError(safe_msg) from None
    finally:
        await engine.dispose()

