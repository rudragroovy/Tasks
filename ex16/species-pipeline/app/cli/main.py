import typer
import asyncio
import csv
import json
from pathlib import Path
from rich.console import Console
from dotenv import load_dotenv

load_dotenv()

from app.logging.logger import logger
from app.resolver.resolver import Resolver
from app.orchestrator.pipeline import Orchestrator
from app.merger.merger import Merger
from app.gap_detector.detector import GapDetector
from app.llm.client import LLMFiller
from app.storage.upsert import upsert_species
from app.validator.validators import Validator
from app.reporter.builders import CoverageReporter

# Import Adapters
from app.adapters.gbif import GBIFAdapter
from app.adapters.inaturalist import INaturalistAdapter
from app.adapters.wikipedia import WikipediaAdapter
from app.adapters.wikidata import WikidataAdapter
from app.adapters.iucn import IUCNAdapter

app = typer.Typer(help="Species Data Aggregation Pipeline")
console = Console()

async def process_species_list(inputs: list[str]) -> None:
    # Initialize components
    resolver = Resolver()
    adapters = [
        GBIFAdapter(),
        INaturalistAdapter(),
        WikipediaAdapter(),
        WikidataAdapter(),
        IUCNAdapter()
    ]
    orchestrator = Orchestrator(adapters)
    merger = Merger()
    gap_detector = GapDetector()
    llm_filler = LLMFiller()
    validator = Validator()
    
    total = len(inputs)
    success_count = 0
    records_processed = []
    
    # We could use a semaphore for concurrency, but for now we iterate sequentially
    # or fan out depending on rate limits. Sequential is safer for rate limits without advanced throttling.
    for idx, raw_name in enumerate(inputs, 1):
        console.print(f"[bold blue]Processing {idx}/{total}:[/bold blue] {raw_name}")
        
        # 1. Resolve Name
        canonical = await resolver.resolve_name(raw_name)
        if not canonical:
            logger.warning("unresolved_name", input=raw_name)
            console.print(f"[yellow]Failed to resolve canonical name for {raw_name}[/yellow]")
            continue
            
        console.print(f"  Canonical: {canonical}")
        
        # 2. Fan-out API requests
        adapter_results = await orchestrator.run_adapters(canonical)
        
        # 3. Merge results
        record = merger.merge(canonical, adapter_results)
        
        # 4. Gap Detection
        missing = gap_detector.detect_gaps(record)
        if missing:
            console.print(f"  Gaps detected: {len(missing)} fields")
            # 5. LLM Fill
            record = await llm_filler.fill_gaps(record, missing)
            
        # 6. Validation
        record = validator.validate(record)
            
        # 7. Upsert to DB
        await upsert_species(record)
        success_count += 1
        records_processed.append(record)
        console.print(f"[green]Successfully processed {canonical}[/green]\n")
        
    console.print(f"[bold green]Pipeline completed! {success_count}/{total} species processed.[/bold green]")
    
    # 8. Reporter
    reporter = CoverageReporter(records_processed)
    reporter.generate_report()
    console.print(f"[blue]Coverage report generated at coverage_report.md[/blue]")


@app.command("run")
def run_pipeline(
    input_file: Path = typer.Option(..., "--input", "-i", help="Path to input CSV or JSON list of species"),
    out_file: Path = typer.Option(None, "--output", "-o", help="Optional output path (SQLite or DB proxy, unused if DATABASE_URL is set)")
) -> None:
    """
    Runs the full biodiversity aggregation pipeline.
    """
    logger.info("pipeline_started", input=str(input_file))
    
    species_list = []
    if input_file.suffix.lower() == ".csv":
        with open(input_file, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                if row and row[0].strip() and row[0].lower() != "species_name": # skip header
                    species_list.append(row[0].strip())
    elif input_file.suffix.lower() == ".json":
        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                species_list = data
    else:
        console.print("[red]Unsupported file format. Use .csv or .json[/red]")
        raise typer.Exit(1)
        
    if not species_list:
        console.print("[red]No species names found in input.[/red]")
        raise typer.Exit(1)
        
    if out_file:
        db_url = f"sqlite+aiosqlite:///{out_file.resolve()}"
        logger.info("using_sqlite", url=db_url)
    else:
        import os
        db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5433/species_pipeline")
        logger.info("using_postgresql", url=db_url)
        
    from app.storage.database import init_db
    
    async def run_pipeline_with_db():
        await init_db(db_url)
        await process_species_list(species_list)
        
    asyncio.run(run_pipeline_with_db())

if __name__ == "__main__":
    app()
