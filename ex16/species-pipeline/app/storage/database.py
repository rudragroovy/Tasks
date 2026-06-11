import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.db import Base

# Default fallback if not overwritten by init_db
raw_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5433/species_pipeline")
engine = create_async_engine(raw_url, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db(db_url: str):
    global engine, AsyncSessionLocal
    engine = create_async_engine(db_url, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # Ensure tables are created automatically
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
