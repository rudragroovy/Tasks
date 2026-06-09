import os
import sys
import json
from openai import OpenAI

dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(dotenv_path):
    with open(dotenv_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip().strip("'\"")

api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    print("Error: OPENROUTER_API_KEY not found.")
    sys.exit(1)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key
)

models = {
    "openai": "openai/gpt-4o-mini",
    "gemini": "google/gemini-2.5-flash",
    "anthropic": "anthropic/claude-3-haiku"
}

prompts = [
    "Write a haiku about a robot learning to feel.",
    "Explain the concept of recursion in 2 short sentences.",
    "Solve for x: 3x + 5 = 20. Show your work step-by-step.",
    "What is the capital of France and what is it famous for?",
    "Write a short Python function to reverse a string."
]

results = []

for provider, model_id in models.items():
    print(f"\n--- Testing provider: {provider} ({model_id}) ---")
    provider_stats = {
        "provider": provider,
        "model": model_id,
        "total_input_tokens": 0,
        "total_output_tokens": 0,
        "responses": []
    }
    
    for i, prompt in enumerate(prompts):
        print(f"Prompt {i+1}/{len(prompts)}...")
        try:
            completion = client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500
            )
            
            usage = completion.usage
            in_tokens = usage.prompt_tokens if usage else 0
            out_tokens = usage.completion_tokens if usage else 0
            
            provider_stats["total_input_tokens"] += in_tokens
            provider_stats["total_output_tokens"] += out_tokens
            
            provider_stats["responses"].append({
                "prompt": prompt,
                "input_tokens": in_tokens,
                "output_tokens": out_tokens,
                "response": completion.choices[0].message.content
            })
            
        except Exception as e:
            print(f"Error testing model {model_id}: {e}")
            
    results.append(provider_stats)

with open(os.path.join(os.path.dirname(__file__), "results.json"), "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("\nBenchmark complete. Results saved to results.json.")
