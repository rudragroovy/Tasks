from typing import Dict, Any
from app.interfaces.adapter import BaseAdapter

class INaturalistAdapter(BaseAdapter):
    @property
    def source_name(self) -> str:
        return "inaturalist"

    async def fetch(self, canonical_name: str) -> Dict[str, Any]:
        url = "https://api.inaturalist.org/v1/taxa"
        params = {"q": canonical_name, "is_active": "true", "per_page": 1}
        
        data = await self.get_json(url, params=params)
        if not data or not data.get("results"):
            return {}

        taxon = data["results"][0]
        
        # Verify the matched taxon matches our canonical name roughly
        if canonical_name.lower() not in taxon.get("name", "").lower():
            # Sometimes iNat returns fuzzy matches, if the name is off we might skip
            pass
            
        result = {}
        
        # iNat is great for common names
        common_names = []
        if taxon.get("preferred_common_name"):
            common_names.append(taxon["preferred_common_name"])
            
        # Optional: Parse taxon["names"] for more common names
        for n in taxon.get("names", []):
            if n.get("is_valid") and n.get("name") not in common_names and n.get("lexicon") != "Scientific Names":
                common_names.append(n.get("name"))
                if len(common_names) >= 5:
                    break
                    
        if common_names:
            result["common_names"] = common_names
            
        # iNat also gives a default photo
        if taxon.get("default_photo") and taxon["default_photo"].get("medium_url"):
            result["image_urls"] = [taxon["default_photo"]["medium_url"]]
            
        if taxon.get("wikipedia_url"):
            result["wikipedia_url"] = taxon["wikipedia_url"]
            
        return result
