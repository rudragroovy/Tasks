from typing import Dict, Any
from app.interfaces.adapter import BaseAdapter
import urllib.parse

class WikipediaAdapter(BaseAdapter):
    @property
    def source_name(self) -> str:
        return "wikipedia"

    async def fetch(self, canonical_name: str) -> Dict[str, Any]:
        # Usually wikipedia titles match canonical name (e.g. Panthera tigris)
        title = urllib.parse.quote(canonical_name)
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
        
        # Wikipedia requires a descriptive User-Agent
        headers = {"User-Agent": "SpeciesPipeline/1.0 (https://github.com/example/species-pipeline)"}
        
        data = await self.get_json(url, headers=headers)
        if not data or "extract" not in data:
            return {}

        result = {}
        
        if data.get("extract"):
            result["description"] = data["extract"]
            
        if data.get("content_urls") and data["content_urls"].get("desktop"):
            result["wikipedia_url"] = data["content_urls"]["desktop"]["page"]
            
        if data.get("thumbnail") and data["thumbnail"].get("source"):
            result["image_urls"] = [data["thumbnail"]["source"]]
            
        return result
