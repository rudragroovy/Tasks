import httpx
from typing import Optional
from app.caching.cache import CacheAbstraction
from app.logging.logger import logger

class Resolver:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)

    async def resolve_name(self, input_name: str) -> Optional[str]:
        """
        Uses GBIF species/match to resolve an input name to a canonical scientific name.
        """
        cache_key = f"resolver:gbif:{input_name}"
        cached = CacheAbstraction.get(cache_key)
        if cached:
            logger.info("resolver_cache_hit", input=input_name, resolved=cached)
            return cached

        url = "https://api.gbif.org/v1/species/match"
        params = {"name": input_name, "strict": "false"}
        
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("matchType") in ["EXACT", "FUZZY"] and "scientificName" in data:
                # The scientificName usually includes the author, e.g., "Panthera tigris (Linnaeus, 1758)"
                # To be safer for other APIs, we usually extract the canonicalName
                canonical = data.get("canonicalName", data.get("scientificName"))
                CacheAbstraction.set(cache_key, canonical)
                logger.info("name_resolved", input=input_name, canonical=canonical)
                return canonical
                
        except Exception as e:
            logger.error("resolver_error", input=input_name, error=str(e))
            
        return None
