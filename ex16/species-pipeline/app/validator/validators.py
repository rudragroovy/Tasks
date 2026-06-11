import re
from typing import Optional
from app.models.domain import SpeciesRecord
from app.logging.logger import logger

class Validator:
    def validate(self, record: SpeciesRecord) -> SpeciesRecord:
        """
        Validates fields for sanity. Rejects obvious hallucinations,
        especially from the LLM.
        """
        self._validate_numeric_range(record, "lifespan_years")
        self._validate_numeric_range(record, "weight_kg")
        self._validate_numeric_range(record, "length_cm")
        
        # Check for hallucinated placeholder strings
        for field in record.model_fields.keys():
            val = getattr(record, field)
            if isinstance(val, str) and field in record.llm_filled_fields:
                lower_val = val.lower()
                if any(phrase in lower_val for phrase in ["unknown", "not specified", "fictional", "cannot provide", "as an ai"]):
                    logger.warning("validator_hallucination_detected", species=record.scientific_name, field=field, value=val)
                    setattr(record, field, None)
                    # Remove from provenance
                    record.llm_filled_fields.remove(field)
                    record.field_provenance.pop(field, None)
                    record.confidence_scores.pop(field, None)

        return record

    def _validate_numeric_range(self, record: SpeciesRecord, field: str):
        val = getattr(record, field)
        if not val or not isinstance(val, str):
            return

        # Attempt to find numbers in the string (e.g., "10-15", "Up to 50", "2.5")
        numbers = re.findall(r"[-+]?\d*\.\d+|\d+", val)
        if not numbers:
            return
            
        try:
            # Check if any number is negative
            for num_str in numbers:
                num = float(num_str)
                if num <= 0 and field in record.llm_filled_fields:
                    logger.warning("validator_negative_number_rejected", species=record.scientific_name, field=field, value=val)
                    setattr(record, field, None)
                    record.llm_filled_fields.remove(field)
                    record.field_provenance.pop(field, None)
                    record.confidence_scores.pop(field, None)
                    return
        except ValueError:
            pass
