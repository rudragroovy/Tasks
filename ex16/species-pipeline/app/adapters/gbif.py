from typing import Dict, Any
from app.interfaces.adapter import BaseAdapter
from app.models.domain import Taxonomy

class GBIFAdapter(BaseAdapter):
    @property
    def source_name(self) -> str:
        return "gbif"

    async def fetch(self, canonical_name: str) -> Dict[str, Any]:
        url = "https://api.gbif.org/v1/species/match"
        params = {"name": canonical_name, "strict": "true"}
        
        data = await self.get_json(url, params=params)
        if not data or data.get("matchType") == "NONE":
            return {}

        result = {}
        
        # Taxonomy mapping
        taxonomy = Taxonomy(
            kingdom=data.get("kingdom"),
            phylum=data.get("phylum"),
            class_name=data.get("class"),
            order=data.get("order"),
            family=data.get("family"),
            genus=data.get("genus"),
            species=data.get("species")
        )
        
        # We exclude None values to avoid overwriting valid fields with nulls during merge
        result["taxonomy"] = taxonomy.model_dump(exclude_none=True)
        
        # Status/rank could also be mapped if needed
        return result
