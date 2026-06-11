import asyncio
from typing import List, Dict, Any
from app.interfaces.adapter import BaseAdapter
from app.logging.logger import logger
# We will import the actual adapters here
# from app.adapters.gbif import GBIFAdapter

class Orchestrator:
    def __init__(self, adapters: List[BaseAdapter]):
        self.adapters = adapters

    async def run_adapters(self, canonical_name: str) -> Dict[str, Any]:
        """
        Runs all configured adapters concurrently.
        """
        logger.info("orchestrator_start", species=canonical_name, adapters=[a.source_name for a in self.adapters])
        
        tasks = []
        for adapter in self.adapters:
            tasks.append(adapter.fetch(canonical_name))
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        collected_data = {}
        for adapter, result in zip(self.adapters, results):
            if isinstance(result, Exception):
                logger.error("adapter_failed", source=adapter.source_name, species=canonical_name, error=str(result))
                collected_data[adapter.source_name] = {}
            else:
                collected_data[adapter.source_name] = result or {}
                
        logger.info("orchestrator_complete", species=canonical_name)
        return collected_data
