import os
from typing import Dict, Any
from app.interfaces.adapter import BaseAdapter
from app.logging.logger import logger

class IUCNAdapter(BaseAdapter):
    @property
    def source_name(self) -> str:
        return "iucn"

    async def fetch(self, canonical_name: str) -> Dict[str, Any]:
        token = os.getenv("IUCN_API_TOKEN")
        if not token:
            logger.warning("iucn_missing_token", reason="No IUCN_API_TOKEN in env")
            return {}

        parts = canonical_name.split()
        if len(parts) < 2:
            return {}
            
        genus = parts[0]
        species = parts[1]

        url = "https://api.iucnredlist.org/api/v4/taxa/scientific_name"
        params = {
            "genus_name": genus,
            "species_name": species
        }
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        data = await self.get_json(url, params=params, headers=headers)
        
        if not data or "assessments" not in data:
            return {}
            
        latest_assessment = None
        for assessment in data["assessments"]:
            if assessment.get("latest") and any(scope.get("code") == "1" for scope in assessment.get("scopes", [])):
                latest_assessment = assessment
                break
                
        if not latest_assessment:
            return {}
            
        # The new v4 taxa endpoint doesn't return population trend directly, so we just return the status code
        status_code = latest_assessment.get("red_list_category_code")
        
        return {
            "conservation_status": status_code
        }
