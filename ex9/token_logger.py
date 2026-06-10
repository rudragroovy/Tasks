import csv
import os
from datetime import datetime

DASHBOARD_FILE = os.path.join(os.path.dirname(__file__), "dashboard.csv")

PRICING = {
    "openai/gpt-4o-mini": {"input": 0.150, "output": 0.600, "cached": 0.075},
    "google/gemini-2.5-flash": {"input": 0.075, "output": 0.300, "cached": 0.0375},
    "anthropic/claude-3-haiku": {"input": 0.250, "output": 1.250, "cached": 0.025}
}

def log_api_call(model: str, action: str, prompt_tokens: int, cached_tokens: int, completion_tokens: int):
    file_exists = os.path.exists(DASHBOARD_FILE)
    
    # Calculate costs
    rates = PRICING.get(model, {"input": 0, "output": 0, "cached": 0})
    
    # Non-cached prompt tokens
    fresh_prompt_tokens = max(0, prompt_tokens - cached_tokens)
    
    cost_fresh = (fresh_prompt_tokens / 1_000_000) * rates["input"]
    cost_cached = (cached_tokens / 1_000_000) * rates["cached"]
    cost_output = (completion_tokens / 1_000_000) * rates["output"]
    total_cost = cost_fresh + cost_cached + cost_output
    
    # Cost savings from caching
    standard_input_cost = (prompt_tokens / 1_000_000) * rates["input"]
    savings = max(0, standard_input_cost - (cost_fresh + cost_cached))
    
    with open(DASHBOARD_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow([
                "Timestamp", "Model", "Action", "Prompt_Tokens", 
                "Cached_Tokens", "Completion_Tokens", "Total_Cost_$", "Savings_$"
            ])
            
        writer.writerow([
            datetime.now().isoformat(),
            model,
            action,
            prompt_tokens,
            cached_tokens,
            completion_tokens,
            f"{total_cost:.6f}",
            f"{savings:.6f}"
        ])
