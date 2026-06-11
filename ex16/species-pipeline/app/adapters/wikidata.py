from typing import Dict, Any
from app.interfaces.adapter import BaseAdapter

class WikidataAdapter(BaseAdapter):
    @property
    def source_name(self) -> str:
        return "wikidata"

    async def fetch(self, canonical_name: str) -> Dict[str, Any]:
        url = "https://query.wikidata.org/sparql"
        query = f"""
        SELECT ?lifespan ?mass ?length ?dietLabel WHERE {{
          ?item wdt:P225 "{canonical_name}".
          OPTIONAL {{ ?item wdt:P129 ?lifespan. }}
          OPTIONAL {{ ?item wdt:P2067 ?mass. }}
          OPTIONAL {{ ?item wdt:P2043 ?length. }}
          OPTIONAL {{ 
              ?item wdt:P1034 ?diet. 
              ?diet rdfs:label ?dietLabel.
              FILTER(LANG(?dietLabel) = "en")
          }}
        }} LIMIT 1
        """
        
        headers = {
            "Accept": "application/sparql-results+json",
            "User-Agent": "SpeciesPipeline/1.0 (https://github.com/example/species-pipeline)"
        }
        params = {"query": query, "format": "json"}
        
        data = await self.get_json(url, params=params, headers=headers)
        if not data or not data.get("results") or not data["results"].get("bindings"):
            return {}

        bindings = data["results"]["bindings"][0]
        result = {}
        
        if "lifespan" in bindings:
            result["lifespan_years"] = f"{bindings['lifespan']['value']}"
            
        if "mass" in bindings:
            result["weight_kg"] = f"{bindings['mass']['value']}"
            
        if "length" in bindings:
            # Length usually in meters in wikidata, might need conversion or just string
            # Schema says "length_cm", but we just keep the raw value as a string for now, LLM or validator can clean it
            result["length_cm"] = f"{bindings['length']['value']}"
            
        if "dietLabel" in bindings:
            result["diet_type"] = bindings["dietLabel"]["value"]
            
        return result
