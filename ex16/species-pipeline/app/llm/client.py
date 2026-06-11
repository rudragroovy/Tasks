import os
import json
from typing import List, Dict, Any, Tuple
from app.models.domain import SpeciesRecord
from app.logging.logger import logger

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None

SYSTEM_PROMPT = """You are a highly capable biodiversity data expert. Your task is to fill in missing fields for a given species based on its scientific name and other known facts.

CRITICAL RULES:
1. You must return ONLY valid JSON matching the exact schema requested.
2. You must NOT overwrite or modify any data that has already been provided by an API.
3. You will only provide data for the exact fields explicitly requested in the gap detector's missing list.
4. If you are unsure about a fact or the species is unknown/fictional, omit the field rather than hallucinating.
5. Provide a confidence score for every field you fill.
"""

class LLMFiller:
    def __init__(self):
        api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("LLM_API_KEY")
        self.is_dummy = not api_key or not AsyncOpenAI
        if not self.is_dummy:
            self.client = AsyncOpenAI(
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1" if os.getenv("OPENROUTER_API_KEY") else None
            )
        else:
            logger.warning("llm_filler_dummy_mode", reason="No API key or openai package missing")

    async def fill_gaps(self, record: SpeciesRecord, missing_fields: List[str]) -> SpeciesRecord:
        if not missing_fields:
            return record
            
        logger.info("llm_filling_gaps", species=record.scientific_name, missing=missing_fields)
        
        if self.is_dummy:
            # Dummy implementation for tests/dev
            for field in missing_fields:
                if field == "behavior":
                    record.behavior = "Dummy behavior data"
                    record.llm_filled_fields.append(field)
                    record.confidence_scores[field] = 0.9
                    record.field_provenance[field] = "llm"
            return record

        # Prepare user prompt
        known_data = record.model_dump(exclude={"id", "last_updated", "field_provenance", "sources_used", "llm_filled_fields", "confidence_scores"})
        # Remove empty fields from known_data to save tokens
        known_data = {k: v for k, v in known_data.items() if v}
        
        user_prompt = f"""We have collected data for the species: "{record.scientific_name}".
The following authoritative data was retrieved from external APIs:
{json.dumps(known_data, indent=2)}

The pipeline detected gaps. Please fill in the following missing fields:
{json.dumps(missing_fields)}

Respond with a JSON object in the following format:
{{
  "llm_filled_fields": ["field_name_1", "field_name_2"],
  "field_name_1": "Your researched value",
  "field_name_2": "Your researched value",
  "confidence_scores": {{
    "field_name_1": 0.85,
    "field_name_2": 0.90
  }}
}}"""

        try:
            model_name = os.getenv("OPENROUTER_MODEL_NAME") if os.getenv("OPENROUTER_MODEL_NAME") else ("openai/gpt-4o-mini" if os.getenv("OPENROUTER_API_KEY") else "gpt-4o-mini")
            response = await self.client.chat.completions.create(
                model=model_name, # cheap model to stay under $2
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
            content = response.choices[0].message.content
            llm_data = json.loads(content)
            
            filled_fields = llm_data.get("llm_filled_fields", [])
            scores = llm_data.get("confidence_scores", {})
            
            for field in filled_fields:
                if field in missing_fields and field in llm_data:
                    # Do not overwrite!
                    val = llm_data[field]
                    if val is not None:
                        # Fix LLM returning string for list fields
                        if field in ["geographic_range", "image_urls", "common_names"] and isinstance(val, str):
                            val = [val]
                        
                        # Fix LLM returning ints for string fields
                        if field in ["lifespan_years", "weight_kg", "length_cm"] and isinstance(val, (int, float)):
                            val = str(val)
                            
                        current_val = getattr(record, field, None)
                        if not current_val: # Double check
                            setattr(record, field, val)
                            record.llm_filled_fields.append(field)
                            record.confidence_scores[field] = scores.get(field, 0.0)
                            record.field_provenance[field] = "llm"
                        
            # Keep track of cost internally or logger
            tokens = response.usage.total_tokens
            logger.info("llm_success", species=record.scientific_name, filled=filled_fields, tokens=tokens)
            
        except Exception as e:
            logger.error("llm_error", species=record.scientific_name, error=str(e))
            
        return SpeciesRecord.model_validate(record.model_dump())
