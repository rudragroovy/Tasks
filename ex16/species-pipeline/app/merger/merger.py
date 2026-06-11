from typing import Dict, Any, List
from app.models.domain import SpeciesRecord

PRIORITIES = {
    "taxonomy": ["gbif", "itis", "ncbi", "wikidata"],
    "conservation_status": ["iucn", "wikidata"],
    "description": ["wikipedia", "eol"],
    "common_names": ["inaturalist", "wikipedia", "gbif"],
    "lifespan_years": ["wikidata", "eol"],
    "image_urls": ["commons", "wikipedia", "inaturalist"],
    "behavior": ["eol", "wikipedia"],
    "geographic_range": ["gbif", "iucn", "wikidata"],
}

class Merger:
    def merge(self, canonical_name: str, adapter_results: Dict[str, Dict[str, Any]]) -> SpeciesRecord:
        merged_data: Dict[str, Any] = {
            "scientific_name": canonical_name,
            "sources_used": [src for src, data in adapter_results.items() if data],
            "field_provenance": {},
            "common_names": [],
            "geographic_range": [],
            "image_urls": []
        }
        
        # We need to look at all fields defined in SpeciesRecord
        record_fields = SpeciesRecord.model_fields.keys()
        
        for field in record_fields:
            if field in ["id", "scientific_name", "sources_used", "field_provenance", "llm_filled_fields", "confidence_scores", "last_updated"]:
                continue
                
            priority_list = PRIORITIES.get(field, [])
            
            # Find which source to use
            selected_source = None
            selected_value = None
            
            # Check prioritized sources first
            for source in priority_list:
                if source in adapter_results and field in adapter_results[source] and adapter_results[source][field]:
                    selected_source = source
                    selected_value = adapter_results[source][field]
                    break
                    
            # If not found in prioritized sources, check any available source
            if not selected_source:
                for source, data in adapter_results.items():
                    if field in data and data[field]:
                        selected_source = source
                        selected_value = data[field]
                        break
                        
            if selected_source and selected_value:
                merged_data[field] = selected_value
                merged_data["field_provenance"][field] = selected_source

        return SpeciesRecord(**merged_data)
