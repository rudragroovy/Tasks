import os
from pathlib import Path

PROJECT_ROOT = Path("species-pipeline")

DIRECTORIES = [
    "app/cli",
    "app/config",
    "app/core",
    "app/adapters/gbif",
    "app/adapters/inaturalist",
    "app/adapters/wikipedia",
    "app/adapters/wikidata",
    "app/adapters/eol",
    "app/adapters/iucn",
    "app/adapters/itis",
    "app/adapters/ncbi",
    "app/adapters/commons",
    "app/resolver",
    "app/merger",
    "app/validator",
    "app/gap_detector",
    "app/llm",
    "app/storage",
    "app/reporter",
    "app/orchestrator",
    "app/services",
    "app/repositories",
    "app/models",
    "app/schemas",
    "app/prompts",
    "app/caching",
    "app/logging",
    "app/telemetry",
    "app/exceptions",
    "app/interfaces",
    "app/utils",
    "migrations",
    "tests/unit",
    "tests/integration",
    "tests/fixtures",
    "docs",
    "scripts",
    "cache",
    "reports",
    "datasets",
    "output",
    "examples",
    "docker",
    ".github/workflows",
    "configs",
]

FILES = {
    "README.md": "# Species Data Aggregation Pipeline\n\n## Installation\n\n## Architecture\n\n## Pipeline Flow\n\n## Commands\n\n## Configuration\n\n## Testing\n\n## Deployment\n\n## Contributing",
    "ARCHITECTURE.md": "# Architecture\n\nClean Architecture + Hexagonal Architecture.",
    "CONTRIBUTING.md": "# Contributing\n\nGuidelines for contributing to the project.",
    "API_SOURCES.md": "# API Sources\n\nList of supported external APIs.",
    "MERGING_RULES.md": "# Merging Rules\n\nRules for merging species data from different sources.",
    "LLM_POLICY.md": "# LLM Policy\n\nGuidelines for using LLMs to fill missing information.",
    "PROMPTS.md": "# Prompts\n\nPrompt templates.",
    "coverage_report.md": "# Coverage Report Template\n\nPlaceholder for coverage report.",
    ".env.example": "DATABASE_URL=postgresql://user:password@localhost/species\nGBIF_URL=\nINAT_URL=\nEOL_URL=\nWIKIPEDIA_URL=\nIUCN_TOKEN=\nOPENROUTER_API_KEY=\nCACHE_DIR=./cache\nREPORT_DIR=./reports\nLOG_LEVEL=INFO\n",
    "docker-compose.yml": "version: '3.8'\nservices:\n  db:\n    image: postgres:15\n    environment:\n      POSTGRES_USER: user\n      POSTGRES_PASSWORD: password\n      POSTGRES_DB: species\n",
    "Dockerfile": "FROM python:3.12-slim\n\nWORKDIR /app\nCOPY pyproject.toml poetry.lock ./ \nRUN pip install poetry && poetry install --no-dev\nCOPY . .\nCMD [\"python\", \"-m\", \"app.cli\"]\n",
    "mkdocs.yml": "site_name: Species Pipeline\n",
    "pyproject.toml": "[tool.poetry]\nname = \"species-pipeline\"\nversion = \"0.1.0\"\ndescription = \"Species Data Aggregation Pipeline\"\nauthors = [\"Author <author@example.com>\"]\n\n[tool.poetry.dependencies]\npython = \"^3.12\"\ntyper = \"^0.9.0\"\nasyncio = \"^3.4.3\"\nhttpx = \"^0.27.0\"\npydantic = \"^2.6.0\"\nsqlalchemy = \"^2.0.25\"\nalembic = \"^1.13.1\"\ndiskcache = \"^5.6.3\"\nstructlog = \"^24.1.0\"\npython-dotenv = \"^1.0.1\"\n\n[tool.poetry.dev-dependencies]\npytest = \"^8.0.0\"\nblack = \"^24.1.1\"\nruff = \"^0.2.1\"\nisort = \"^5.13.2\"\nmypy = \"^1.8.0\"\nmkdocs = \"^1.5.3\"\n",
    "alembic.ini": "[alembic]\nscript_location = migrations\nsqlalchemy.url = postgresql://user:password@localhost/species\n",
    "ruff.toml": "[tool.ruff]\nline-length = 88\n",
    "mypy.ini": "[mypy]\npython_version = 3.12\nstrict = true\n",
    "pytest.ini": "[pytest]\nasyncio_mode = auto\n",
    ".gitignore": "__pycache__/\n*.pyc\n.env\n/cache\n/reports\n/output\n",
    ".pre-commit-config.yaml": "repos:\n-   repo: https://github.com/pre-commit/pre-commit-hooks\n    rev: v4.5.0\n    hooks:\n    -   id: trailing-whitespace\n",
    "Makefile": "test:\n\tpytest\n",
    ".github/workflows/ci.yml": "name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n",
    "app/cli/main.py": "import typer\n\napp = typer.Typer()\n\n@app.command()\ndef run():\n    pass\n\n@app.command()\ndef validate():\n    pass\n\n@app.command()\ndef report():\n    pass\n\n@app.command()\ndef cache_clear():\n    pass\n\n@app.command()\ndef health():\n    pass\n\n@app.command()\ndef test_source():\n    pass\n\n@app.command()\ndef migrate():\n    pass\n\nif __name__ == \"__main__\":\n    app()\n",
    "app/models/domain.py": '''from pydantic import BaseModel\nfrom typing import List, Optional, Dict, Any\nfrom uuid import UUID\n\nclass SpeciesRecord(BaseModel):\n    id: UUID\n    name: str\n\nclass Taxonomy(BaseModel):\n    kingdom: Optional[str]\n    phylum: Optional[str]\n    # TODO: Add remaining taxonomy fields\n\nclass SourceMetadata(BaseModel):\n    source_name: str\n    confidence: float\n\nclass FieldProvenance(BaseModel):\n    field_name: str\n    source: str\n\nclass ConfidenceScore(BaseModel):\n    score: float\n\nclass LLMFill(BaseModel):\n    field_name: str\n    value: Any\n\nclass CoverageMetrics(BaseModel):\n    total_records: int\n\nclass PipelineReport(BaseModel):\n    run_id: UUID\n\nclass ValidationResult(BaseModel):\n    is_valid: bool\n    errors: List[str]\n''',
    "app/models/db.py": '''from sqlalchemy import Column, String, Float, Integer, JSON, DateTime\nfrom sqlalchemy.dialects.postgresql import UUID\nfrom sqlalchemy.ext.declarative import declarative_base\nimport uuid\nfrom datetime import datetime\n\nBase = declarative_base()\n\nclass Species(Base):\n    __tablename__ = 'species'\n    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)\n    name = Column(String)\n    created_at = Column(DateTime, default=datetime.utcnow)\n\nclass Taxonomy(Base):\n    __tablename__ = 'taxonomy'\n    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)\n\nclass FieldProvenance(Base):\n    __tablename__ = 'field_provenance'\n    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)\n\nclass LLMFill(Base):\n    __tablename__ = 'llm_fills'\n    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)\n    data = Column(JSON)\n\nclass ApiCache(Base):\n    __tablename__ = 'api_cache'\n    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)\n\nclass PipelineRun(Base):\n    __tablename__ = 'pipeline_runs'\n    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)\n\nclass CoverageReport(Base):\n    __tablename__ = 'coverage_reports'\n    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)\n''',
    "app/interfaces/adapter.py": '''from abc import ABC, abstractmethod\nfrom typing import Any, Dict\n\nclass SourceAdapter(ABC):\n    @abstractmethod\n    async def fetch(self, query: str) -> Dict[str, Any]:\n        pass\n\n    @abstractmethod\n    async def normalize(self, raw_data: Dict[str, Any]) -> Any:\n        pass\n\n    @abstractmethod\n    async def health_check(self) -> bool:\n        pass\n\n    @abstractmethod\n    async def rate_limit(self) -> None:\n        pass\n''',
    "app/merger/interfaces.py": '''from abc import ABC, abstractmethod\n\nclass PriorityResolver(ABC):\n    pass\n\nclass FieldConflictResolver(ABC):\n    pass\n\nclass MergeStrategy(ABC):\n    pass\n\nclass SourceWeighting(ABC):\n    pass\n\nclass ImageDeduplication(ABC):\n    pass\n\nclass ProvenanceTracker(ABC):\n    pass\n''',
    "app/gap_detector/detector.py": '''class MissingFieldDetector:\n    pass\n\nclass ConfidenceChecker:\n    pass\n\nclass RequiredFieldValidator:\n    pass\n\nclass LLMRequestBuilder:\n    pass\n''',
    "app/llm/client.py": '''class SystemPromptTemplate:\n    pass\n\nclass UserPromptTemplate:\n    pass\n\nclass JSONSchema:\n    pass\n\nclass ResponseParser:\n    pass\n\nclass HallucinationDetector:\n    pass\n\nclass ConfidenceEvaluator:\n    pass\n\nclass PromptCacheInterface:\n    pass\n''',
    "app/validator/validators.py": '''class SchemaValidator:\n    pass\n\nclass RangeValidator:\n    pass\n\nclass EnumValidator:\n    pass\n\nclass TypeValidator:\n    pass\n\nclass BusinessValidator:\n    pass\n\nclass ConfidenceValidator:\n    pass\n''',
    "app/reporter/builders.py": '''class CoverageReportBuilder:\n    pass\n\nclass SourceContributionBuilder:\n    pass\n\nclass LLMUsageBuilder:\n    pass\n\nclass TokenUsageBuilder:\n    pass\n\nclass CostReportBuilder:\n    pass\n\nclass MissingFieldsBuilder:\n    pass\n\nclass ValidationFailuresBuilder:\n    pass\n''',
    "app/caching/cache.py": '''class CacheAbstraction:\n    # TODO: Implement disk, memory, TTL, key hashing, response serialization\n    pass\n''',
    "app/logging/logger.py": '''import structlog\n\ndef setup_logging():\n    # TODO: Add structured logging with pipeline id, species id, adapter, duration, status, errors, retry count\n    pass\n'''
}

ADAPTERS = ["gbif", "inaturalist", "wikipedia", "wikidata", "eol", "iucn", "itis", "ncbi", "commons"]
ADAPTER_FILES = ["client.py", "mapper.py", "parser.py", "models.py", "config.py", "exceptions.py", "README.md"]

for adapter in ADAPTERS:
    for file in ADAPTER_FILES:
        FILES[f"app/adapters/{adapter}/{file}"] = f"# TODO: Implement {file} for {adapter} adapter\n"

def main():
    for d in DIRECTORIES:
        (PROJECT_ROOT / d).mkdir(parents=True, exist_ok=True)
        (PROJECT_ROOT / d / "__init__.py").touch()
        
    for file_path, content in FILES.items():
        full_path = PROJECT_ROOT / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding='utf-8')

    print("Project generation complete.")

if __name__ == "__main__":
    main()
