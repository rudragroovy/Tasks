from sqlalchemy import Column, String, JSON, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase
import uuid
from datetime import datetime

class Base(DeclarativeBase):
    pass

def generate_uuid():
    return str(uuid.uuid4())

class Species(Base):
    __tablename__ = 'species'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    scientific_name = Column(String, unique=True, index=True, nullable=False)
    common_names = Column(JSON().with_variant(JSONB, 'postgresql'), default=list)
    taxonomy = Column(JSON().with_variant(JSONB, 'postgresql'), default=dict)
    description = Column(String, nullable=True)
    habitat = Column(String, nullable=True)
    geographic_range = Column(JSON().with_variant(JSONB, 'postgresql'), default=list)
    diet_type = Column(String, nullable=True)
    conservation_status = Column(String, nullable=True)
    population_trend = Column(String, nullable=True)
    lifespan_years = Column(String, nullable=True)
    weight_kg = Column(String, nullable=True)
    length_cm = Column(String, nullable=True)
    behavior = Column(String, nullable=True)
    reproduction = Column(String, nullable=True)
    image_urls = Column(JSON().with_variant(JSONB, 'postgresql'), default=list)
    wikipedia_url = Column(String, nullable=True)
    sources_used = Column(JSON().with_variant(JSONB, 'postgresql'), default=list)
    field_provenance = Column(JSON().with_variant(JSONB, 'postgresql'), default=dict)
    llm_filled_fields = Column(JSON().with_variant(JSONB, 'postgresql'), default=list)
    confidence_scores = Column(JSON().with_variant(JSONB, 'postgresql'), default=dict)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PipelineRun(Base):
    __tablename__ = 'pipeline_runs'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String) # RUNNING, SUCCESS, FAILED
    total_species = Column(JSON().with_variant(JSONB, 'postgresql'), default=dict) # E.g., stats
    total_cost = Column(String, nullable=True)

class CoverageReport(Base):
    __tablename__ = 'coverage_reports'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), nullable=False)
    report_data = Column(JSON().with_variant(JSONB, 'postgresql'), default=dict)
