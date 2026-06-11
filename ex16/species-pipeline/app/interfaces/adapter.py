from abc import ABC, abstractmethod
import httpx
from typing import Dict, Any, Optional
import asyncio
from app.caching.cache import CacheAbstraction
from app.logging.logger import logger

class BaseAdapter(ABC):
    def __init__(self):
        headers = {"User-Agent": "SpeciesDataPipeline/1.0 (test@example.com)"}
        self.client = httpx.AsyncClient(timeout=10.0, headers=headers)
    
    @property
    @abstractmethod
    def source_name(self) -> str:
        pass
        
    async def get_json(self, url: str, params: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None) -> Optional[Dict[str, Any]]:
        # Create cache key
        cache_key = f"{self.source_name}:{url}:{params}"
        
        cached = CacheAbstraction.get(cache_key)
        if cached:
            logger.info("cache_hit", source=self.source_name, url=url)
            return cached
            
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = await self.client.get(url, params=params, headers=headers)
                if response.status_code == 429:
                    logger.warning("rate_limit_hit", source=self.source_name, attempt=attempt)
                    await asyncio.sleep(2 ** attempt)
                    continue
                response.raise_for_status()
                data = response.json()
                
                # Cache successful response
                CacheAbstraction.set(cache_key, data)
                return data
            except httpx.HTTPError as e:
                logger.error("http_error", source=self.source_name, error=str(e))
                if attempt == max_retries - 1:
                    return None
            except Exception as e:
                logger.error("unknown_error", source=self.source_name, error=str(e))
                return None
        return None

    @abstractmethod
    async def fetch(self, canonical_name: str) -> Dict[str, Any]:
        """Fetch data for a species and return a dictionary of fields to update."""
        pass
