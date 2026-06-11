# Species Data Aggregation Pipeline Architecture

## Pipeline Architecture

```text
  ┌─────────────┐
  │ species.csv │  scientific or common names
  └──────┬──────┘
         ▼
  ┌──────────────────────┐
  │ Resolver             │  GBIF species/match → canonical name + taxonKey
  └──────┬───────────────┘
         ▼
  ┌──────────────────────────────────────────────┐
  │ Fan-out adapters (async / parallel)          │
  │   GBIF · iNat · Wikipedia · Wikidata · IUCN  │
  │   each → { partial_record, source_tag }      │
  └──────┬───────────────────────────────────────┘
         ▼
  ┌──────────────────────┐
  │ Merger               │  per-field priority rules
  │                      │  record field_provenance
  └──────┬───────────────┘
         ▼
  ┌──────────────────────┐
  │ Gap detector         │  list missing / low-confidence fields
  └──────┬───────────────┘
         ▼
  ┌──────────────────────┐
  │ LLM filler           │  JSON-only output · cite confidence
  │  (Claude / OpenRouter)│ never overwrites API data
  └──────┬───────────────┘
         ▼
  ┌──────────────────────┐
  │ Validator            │  type · range · sanity checks
  └──────┬───────────────┘
         ▼
  ┌──────────────────────┐
  │ Storage              │  Postgres or Portable SQLite (Dual-Engine)
  │                      │  idempotent upsert on scientific_name
  └──────┬───────────────┘
         ▼
  ┌──────────────────────┐
  │ Reporter             │  coverage_report.md
  └──────────────────────┘
```

### Per-field Priority Rules

```text
taxonomy            → gbif > wikidata
conservation_status → iucn > wikidata > llm
description         → wikipedia > llm
common_names        → inat > wikipedia > gbif
lifespan_years      → wikidata > llm
image_urls          → wikipedia > inat
behavior            → wikipedia > llm
geographic_range    → gbif > iucn > wikidata
```

## Target Schema

Every stored species record must match this shape. Provenance per field is mandatory.

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
  "field_provenance": {       // which source supplied each field
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