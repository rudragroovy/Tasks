from typing import List, Dict
from collections import defaultdict
from app.models.domain import SpeciesRecord
from app.logging.logger import logger

class CoverageReporter:
    def __init__(self, records: List[SpeciesRecord]):
        self.records = records
        self.total_species = len(records)
        
    def generate_report(self, output_path: str = "coverage_report.md"):
        if self.total_species == 0:
            logger.warning("coverage_report_empty", reason="No records provided")
            return
            
        fields_to_track = [
            "common_names", "taxonomy", "description", "habitat", "geographic_range",
            "diet_type", "conservation_status", "population_trend", "lifespan_years",
            "weight_kg", "length_cm", "behavior", "reproduction", "image_urls"
        ]
        
        field_fill_counts = defaultdict(int)
        source_contributions = defaultdict(int)
        total_fields_possible = self.total_species * len(fields_to_track)
        llm_filled_total = 0
        total_fields_filled = 0
        
        for record in self.records:
            # Check fields
            for field in fields_to_track:
                val = getattr(record, field)
                if val and (not isinstance(val, list) or len(val) > 0):
                    field_fill_counts[field] += 1
                    total_fields_filled += 1
                    
            # Count provenance
            for field, source in record.field_provenance.items():
                if field in fields_to_track:
                    source_contributions[source] += 1
                    if source == "llm":
                        llm_filled_total += 1
                        
        # Format Report
        lines = [
            "# Species Pipeline Coverage Report",
            f"**Total Species Processed:** {self.total_species}",
            f"**Total Fields Possible:** {total_fields_possible}",
            f"**Total Fields Filled:** {total_fields_filled} ({total_fields_filled/total_fields_possible:.1%})",
            "",
            "## Field Fill Rates",
            "| Field | Fill Rate | Count |",
            "|-------|-----------|-------|"
        ]
        
        for field in fields_to_track:
            count = field_fill_counts[field]
            pct = count / self.total_species
            lines.append(f"| {field} | {pct:.1%} | {count}/{self.total_species} |")
            
        lines.extend([
            "",
            "## Source Contributions",
            "| Source | Fields Contributed | % of Filled Fields |",
            "|--------|--------------------|--------------------|"
        ])
        
        # Sort sources by contribution
        sorted_sources = sorted(source_contributions.items(), key=lambda x: x[1], reverse=True)
        for source, count in sorted_sources:
            pct = count / total_fields_filled if total_fields_filled > 0 else 0
            lines.append(f"| {source} | {count} | {pct:.1%} |")
            
        lines.extend([
            "",
            "## LLM Dependency",
            f"**Total LLM Invocations (Fields):** {llm_filled_total}",
            f"**LLM Fill % (of all filled fields):** {llm_filled_total/total_fields_filled if total_fields_filled > 0 else 0:.1%}"
        ])
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
            
        logger.info("coverage_report_generated", path=output_path)
