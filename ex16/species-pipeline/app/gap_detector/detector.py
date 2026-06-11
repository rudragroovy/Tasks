from typing import List
from app.models.domain import SpeciesRecord

class GapDetector:
    def detect_gaps(self, record: SpeciesRecord) -> List[str]:
        missing = []
        
        # Fields that the LLM is allowed to fill or that we want complete
        fields_to_check = [
            "description", "habitat", "diet_type", 
            "conservation_status", "population_trend", 
            "lifespan_years", "weight_kg", "length_cm", 
            "behavior", "reproduction"
        ]
        
        # We might also check lists
        list_fields = ["geographic_range"]
        
        record_dict = record.model_dump()
        
        for field in fields_to_check:
            val = record_dict.get(field)
            if val is None or str(val).strip() == "":
                missing.append(field)
                
        for field in list_fields:
            val = record_dict.get(field)
            if val is None or len(val) == 0:
                missing.append(field)
                
        return missing
