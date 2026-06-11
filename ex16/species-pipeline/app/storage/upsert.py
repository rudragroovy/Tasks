from app.models.db import Species
from app.models.domain import SpeciesRecord
from app.logging.logger import logger

async def upsert_species(record: SpeciesRecord) -> None:
    # Dynamically import to ensure we use the engine initialized by init_db
    from app.storage.database import AsyncSessionLocal, engine
    
    async with AsyncSessionLocal() as session:
        # Convert Pydantic model to dict
        data = record.model_dump(exclude={"id"})
        
        # Taxonomy needs to be dict
        if "taxonomy" in data and hasattr(data["taxonomy"], "model_dump"):
            data["taxonomy"] = data["taxonomy"].model_dump()
            
        dialect_name = engine.name
        
        if dialect_name == "postgresql":
            from sqlalchemy.dialects.postgresql import insert
            stmt = insert(Species).values(data)
            update_dict = {c.name: c for c in stmt.excluded if not c.primary_key}
            stmt = stmt.on_conflict_do_update(index_elements=['scientific_name'], set_=update_dict)
        elif dialect_name == "sqlite":
            from sqlalchemy.dialects.sqlite import insert
            stmt = insert(Species).values(data)
            update_dict = {c.name: c for c in stmt.excluded if not c.primary_key}
            stmt = stmt.on_conflict_do_update(index_elements=['scientific_name'], set_=update_dict)
        else:
            raise ValueError(f"Unsupported database dialect: {dialect_name}")
            
        try:
            await session.execute(stmt)
            await session.commit()
            logger.info("db_upsert_success", species=record.scientific_name)
        except Exception as e:
            await session.rollback()
            logger.error("db_upsert_failed", species=record.scientific_name, error=str(e))
            raise
