# API Sources Information and Rules

## Rules
- Pick at least 4 free data sources.
- **REQUIRED** sources have no auth.
- **OPTIONAL** sources may need a free token.
- Document why you chose each source in this file or `sources.md`.

## Available Data Sources

### 1. GBIF (Global Biodiversity Information Facility)
- **Status:** REQUIRED (No auth)
- **URL:** `https://api.gbif.org/v1/`
- **Description:** Taxonomy backbone, name resolution (`species/match`), occurrence counts, geographic distribution. Authoritative for canonical scientific names.

### 2. iNaturalist
- **Status:** REQUIRED (No auth)
- **URL:** `https://api.inaturalist.org/v1/`
- **Description:** Common names, observation counts, user photos, regional presence. Strong for vernacular naming across languages.

### 3. Wikipedia REST
- **Status:** REQUIRED (No auth)
- **URL:** `https://en.wikipedia.org/api/rest_v1/page/summary/{title}`
- **Description:** Plain-language description, thumbnail image, canonical article URL. Best for human-readable summary and quick image.

### 4. Wikidata SPARQL
- **Status:** REQUIRED (No auth)
- **URL:** `https://query.wikidata.org/sparql`
- **Description:** Structured facts, lifespan, mass, length, diet type, taxon parent. Query by Wikidata QID resolved from Wikipedia.

### 5. IUCN Red List
- **Status:** REQUIRED (Token auth)
- **URL:** `https://api.iucnredlist.org/api/v4/taxa/scientific_name`
- **Description:** Conservation status, population trend, threat categories. Token via free email registration. Authoritative for conservation fields.