import asyncio
from dotenv import load_dotenv
load_dotenv()

from app.llm.client import LLMFiller
from app.models.domain import SpeciesRecord

async def test():
    client = LLMFiller()
    record = SpeciesRecord(scientific_name='Ursus maritimus')
    print("Testing LLM Filler for Ursus maritimus...")
    record = await client.fill_gaps(record, ['behavior', 'diet_type'])
    print('Filled fields:', record.llm_filled_fields)
    print('Behavior:', record.behavior)
    print('Diet Type:', record.diet_type)
    print('Confidence Scores:', record.confidence_scores)
    print('Provenance:', record.field_provenance)

if __name__ == "__main__":
    asyncio.run(test())
