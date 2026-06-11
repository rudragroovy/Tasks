from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class Taxonomy(BaseModel):
    kingdom: Optional[str] = None
    phylum: Optional[str] = None
    class_name: Optional[str] = Field(None, alias="class")
    order: Optional[str] = None
    family: Optional[str] = None
    genus: Optional[str] = None
    species: Optional[str] = None

class SpeciesRecord(BaseModel):
    id: Optional[UUID] = None
    scientific_name: str
    common_names: List[str] = Field(default_factory=list)
    taxonomy: Taxonomy = Field(default_factory=Taxonomy)
    description: Optional[str] = None
    habitat: Optional[str] = None
    geographic_range: List[str] = Field(default_factory=list)
    diet_type: Optional[str] = None
    conservation_status: Optional[str] = None
    population_trend: Optional[str] = None
    lifespan_years: Optional[str] = None
    weight_kg: Optional[str] = None
    length_cm: Optional[str] = None
    behavior: Optional[str] = None
    reproduction: Optional[str] = None
    image_urls: List[str] = Field(default_factory=list)
    wikipedia_url: Optional[str] = None
    sources_used: List[str] = Field(default_factory=list)
    field_provenance: Dict[str, str] = Field(default_factory=dict)
    llm_filled_fields: List[str] = Field(default_factory=list)
    confidence_scores: Dict[str, float] = Field(default_factory=dict)
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class SourceMetadata(BaseModel):
    source_name: str
    confidence: float

class FieldProvenance(BaseModel):
    field_name: str
    source: str

class ConfidenceScore(BaseModel):
    score: float

class LLMFill(BaseModel):
    field_name: str
    value: Any

class CoverageMetrics(BaseModel):
    total_records: int
    fill_percentages: Dict[str, float]

class PipelineReport(BaseModel):
    run_id: UUID
    coverage: CoverageMetrics
    total_cost: float

class ValidationResult(BaseModel):
    is_valid: bool
    errors: List[str]
