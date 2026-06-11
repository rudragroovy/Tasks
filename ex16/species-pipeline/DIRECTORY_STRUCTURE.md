# Directory and File Responsibilities

- `.env`, `.env.example`: Stores and templates environment variables (e.g., `DATABASE_URL`, `LLM_API_KEY`).
- `.gitignore`: Specifies intentionally untracked files that Git should ignore (e.g., `__pycache__`, `.venv`).
- `alembic.ini`: Configuration file for Alembic database migrations.
- `API_SOURCES.md`: Documentation for external API sources, their URLs, constraints, and purposes.
- `ARCHITECTURE.md`: Documentation of the project's overall pipeline architecture and target schema.
- `CONTRIBUTING.md`: Guidelines for developers contributing to the project.
- `coverage_report.md`: Output file for tracking API coverage and LLM fill rates across species.
- `docker-compose.yml`, `Dockerfile`: Containerization configs for spinning up the PostgreSQL database and the app environment.
- `LLM_POLICY.md`: Documentation defining the guardrails, usage limits, and prompts for the LLM filler.

- `MERGING_RULES.md`: Defines the priority rules for merging conflicting API data.
- `mypy.ini`, `ruff.toml`: Config files for type checking (mypy) and linting/formatting (ruff).
- `poetry.lock`, `pyproject.toml`: Dependency and package management files used by Poetry.
- `PROMPTS.md`: Stores the system and user prompt templates used for the LLM gap filler.
- `README.md`: The primary entry point documentation explaining the project objective and how to run it.
- `species.csv`: Test input file containing a list of raw species names.

### `app/` (Core Application)
- `app/adapters/`: Contains integration logic for external APIs.
  - `gbif.py`: Integration for Global Biodiversity Information Facility.
  - `inaturalist.py`: Integration for iNaturalist API.
  - `wikidata.py`: Integration for Wikidata SPARQL queries.
  - `wikipedia.py`: Integration for Wikipedia REST API.
  - `eol.py`: Integration for Encyclopedia of Life.
- `app/caching/`: Caching logic to prevent repeated API calls.
  - `cache.py`: Diskcache implementation wrapper.
- `app/cli/`: Command-line interface entrypoints.
  - `main.py`: Typer CLI application tying together the entire pipeline.
- `app/gap_detector/`: Logic to find missing fields.
  - `detector.py`: Scans a merged SpeciesRecord to identify empty fields.
- `app/interfaces/`: Abstract base classes enforcing architectural boundaries.
  - `adapter.py`: The `BaseAdapter` with rate-limiting and robust HTTPX fetching logic.
- `app/llm/`: Large Language Model integration.
  - `client.py`: The `LLMFiller` that uses OpenAI's SDK to populate gap fields via structured JSON.
- `app/logging/`: Telemetry and logging configuration.
  - `logger.py`: `structlog` setup for structured JSON logging.
- `app/merger/`: Conflict resolution logic.
  - `merger.py`: Implements the `MERGING_RULES.md` priority hierarchy to pick the best data fields.
- `app/models/`: Data definitions.
  - `domain.py`: Pydantic classes defining the target schema (`SpeciesRecord`).
  - `db.py`: SQLAlchemy ORM classes mapping the schema to PostgreSQL.
- `app/orchestrator/`: Pipeline fan-out control.
  - `pipeline.py`: Uses `asyncio.gather` to execute multiple API adapters concurrently.
- `app/resolver/`: Initial species name resolution.
  - `resolver.py`: Resolves messy raw inputs into canonical scientific names via GBIF.
- `app/storage/`: Database interaction logic.
  - `database.py`: SQLAlchemy async engine and session maker setup.
  - `upsert.py`: Logic for `INSERT ... ON CONFLICT DO UPDATE` to safely store records.
- `app/reporter/`, `app/validator/`: Scaffolded directories intended for final coverage reporting and Pydantic validation checks.

### `migrations/`
- Contains Alembic logic and version control scripts for database schema evolution.
  - `env.py`: Setup script that bridges SQLAlchemy metadata with Alembic.
  - `versions/`: Directory storing the actual generated migration files (e.g. `215ba7420c86_initial_schema.py`).
