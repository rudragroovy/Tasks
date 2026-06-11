import asyncio
from dotenv import load_dotenv
from app.adapters.gbif import GBIFAdapter
from app.adapters.inaturalist import INaturalistAdapter
from app.adapters.wikipedia import WikipediaAdapter
from app.adapters.wikidata import WikidataAdapter
from app.adapters.iucn import IUCNAdapter

load_dotenv()

async def test_adapters():
    species = "Panthera tigris"
    adapters = {
        "gbif": GBIFAdapter(),
        "inaturalist": INaturalistAdapter(),
        "wikipedia": WikipediaAdapter(),
        "wikidata": WikidataAdapter(),
        "iucn": IUCNAdapter()
    }
    
    for name, adapter in adapters.items():
        print(f"--- Testing {name} ---")
        try:
            res = await adapter.fetch(species)
            if res:
                print(f"SUCCESS. Keys returned: {list(res.keys())}")
            else:
                print(f"FAILED or EMPTY.")
        except Exception as e:
            print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    asyncio.run(test_adapters())
