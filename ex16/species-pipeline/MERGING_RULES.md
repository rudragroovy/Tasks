# Per-field priority rules

- **taxonomy**: gbif > wikidata
- **conservation_status**: iucn > wikidata > llm
- **description**: wikipedia > llm
- **common_names**: inat > wikipedia > gbif
- **lifespan_years**: wikidata > llm
- **image_urls**: wikipedia > inat
- **behavior**: wikipedia > llm
- **geographic_range**: gbif > iucn > wikidata

# Merging instructions

- Apply the per-field priority rules to resolve conflicts when multiple sources provide the same field.
- Record the source that provided the final value in the `field_provenance` dictionary.
- If an LLM fills a gap, tag it in `llm_filled_fields[]` and attach a confidence score.
- The LLM must NEVER overwrite a field already filled by an API.