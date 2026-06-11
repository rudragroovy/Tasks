# Species Data Aggregation Pipeline

## Objective
A high-performance, asynchronous pipeline that reads a list of species names, fans out to 5 different biodiversity APIs concurrently, merges the fragmented data into a cohesive schema, detects gaps, and delegates to a strictly-typed LLM (via OpenRouter) to fill missing ecological traits.

The result is a strictly-validated dataset of 50+ species, stored idempotently in a PostgreSQL database with perfect field-level provenance, alongside an automated coverage report.

## Architecture
This pipeline follows **Hexagonal Architecture**:
* **Adapters:** Fetch external data from GBIF, iNaturalist, Wikipedia, Wikidata, and the IUCN Red List v4.
* **Orchestrator:** Fires all adapters simultaneously per species using `asyncio.gather()`.
* **Merger:** Handles conflict resolution between APIs (e.g., favoring Wikipedia over GBIF for descriptions).
* **Gap Detector & LLM:** Scans for empty schema fields and dispatches a JSON-enforced prompt to `gpt-4o-mini`.
* **Validator:** A strict Pydantic layer that intercepts hallucinations (like negative weights).
* **Storage:** Uses SQLAlchemy + asyncpg to elegantly upsert data into PostgreSQL.

## Target Schema
Every stored species record matches this shape. Provenance per field is mandatory and tracked.
```json
{
  "scientific_name":        "Panthera tigris",
  "common_names":           ["Tiger", "Bengal Tiger"],
  "taxonomy": {
    "kingdom": "Animalia", "phylum": "Chordata",
    "class":   "Mammalia", "order":  "Carnivora",
    "family":  "Felidae",  "genus":  "Panthera",
    "species": "tigris"
  },
  "description":           "...",
  "habitat":               "...",
  "geographic_range":      ["IN", "BD", "NP", "RU"],
  "diet_type":             "carnivore",
  "conservation_status":   "Endangered",
  "population_trend":      "decreasing",
  "lifespan_years":        "10–15",
  "weight_kg":             "90–310",
  "length_cm":             "180–390",
  "behavior":              "...",
  "reproduction":          "...",
  "image_urls":            ["..."],
  "wikipedia_url":         "https://en.wikipedia.org/wiki/Tiger",
  "sources_used":          ["gbif", "wikipedia", "iucn", "wikidata"],
  "field_provenance": {       
    "taxonomy":            "gbif",
    "conservation_status": "iucn",
    "description":         "wikipedia",
    "behavior":            "llm"
  },
  "llm_filled_fields":     ["behavior", "reproduction"],
  "confidence_scores":     { "behavior": 0.7, "reproduction": 0.65 },
  "last_updated":          "2026-06-11T10:00:00Z"
}
```

## Constraints Met
- **Free tier APIs:** Exclusively uses free API tiers (including IUCN v4 Bearer Auth).
- **LLM spend < $2:** Integrates OpenRouter using `gpt-4o-mini`, costing fractions of a cent per execution.
- **Idempotency:** Re-running the pipeline uses `ON CONFLICT DO UPDATE`, preventing duplicate rows.
- **Disk Caching:** Uses `diskcache` to persistently cache external API calls, saving network latency on restarts.

## Quickstart Instructions

### Fast Track: Run the Pre-built Docker Image
The fastest way to run this pipeline is by pulling the officially deployed image from Docker Hub. You don't even need to download the source code!
```bash
# Pull the latest image
docker pull rudra79/species-pipeline-app:latest

# Run the portable SQLite pipeline straight from the container
docker run -v ${PWD}:/data --env-file .env rudra79/species-pipeline-app:latest --input /data/species.csv --output /data/local_species.db
```
*(Make sure you have an `.env` and `species.csv` file in your current directory before running).*

---

### Local Development Setup

### 1. Environment Setup
Copy the example environment variables and fill in your OpenRouter and IUCN API keys:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` is pointing to the local docker instance:
`postgresql+asyncpg://user:password@localhost:5433/species`

### 2. Start the Database
Spin up the local PostgreSQL container in the background:
```bash
docker-compose up -d
```

### 3. Install Dependencies
Install all required Python packages via Poetry:
```bash
poetry install
```

### 5. Run the Pipeline
The pipeline features a Dual-Engine architecture. You can run it against the full PostgreSQL container or a local, portable SQLite file.

**Option A: Run with PostgreSQL (Default)**
```bash
poetry run python -m app.cli.main --input species.csv
```

**Option B: Run with portable SQLite**
```bash
poetry run python -m app.cli.main --input species.csv --output local_species.db
```

### 6. View the Data
To explore the populated database using the command line:
```bash
docker-compose exec db psql -U user -d species -c "SELECT scientific_name, conservation_status, lifespan_years FROM species LIMIT 5;"
```

### 7. Teardown
To shut down and destroy the local database container when finished:
```bash
docker-compose down
```

### Output
The pipeline will securely process all species and dump a final `coverage_report.md` in the root directory detailing API vs LLM hit rates!