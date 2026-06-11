import os
from diskcache import Cache
from typing import Any, Optional

CACHE_DIR = os.getenv("CACHE_DIR", "./cache")
_cache = Cache(CACHE_DIR)

class CacheAbstraction:
    @staticmethod
    def get(key: str) -> Optional[Any]:
        return _cache.get(key)
        
    @staticmethod
    def set(key: str, value: Any, ttl_seconds: int = 86400) -> None:
        _cache.set(key, value, expire=ttl_seconds)
        
    @staticmethod
    def clear() -> None:
        _cache.clear()

