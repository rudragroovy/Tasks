# LLM Policy and Constraints

## 6. LLM Guardrails (Non-negotiable)
- LLM **never** overwrites a field already filled by an API.
- LLM only fills missing fields listed by the gap detector.
- Force JSON-only output via schema-bound prompt. Reject malformed responses.
- Every LLM-filled field appears in `llm_filled_fields[]` with a confidence ∈ [0, 1].
- Share system prompt across all species via **prompt caching**. Vary only the per-species facts.
- Validator rejects LLM hallucinations (e.g., lifespan_years <= 0, weight in wrong units).
- Total LLM spend for full 50-species run must stay **under $2**. Log token totals.

## 9. Pipeline Constraints
- **Free tier only:** No paid API spend. IUCN token via free registration only.
- **Respect rate limits:** Implement backoff and retry per source. No request hammering.
- **Pure code:** No Zapier, n8n, Make, visual workflow tools.
- **Async I/O:** Fan-out must be parallel (`asyncio.gather`, `Promise.all`).
- **Cache raw API responses:** Disk cache prevents re-fetch during dev iteration.
- **LLM spend < $2:** For the full 50-species run. Token log mandatory.
- **Idempotent:** Re-running on same input must not duplicate or corrupt rows.

## 11. Cost & Evaluation Rubric (LLM & Cost Constraints)
- **Cost discipline (10%):** LLM spend < $2 for full run. Prompt caching wired. Raw API responses cached on disk. Token report present.
- **LLM discipline (10%):** LLM never overwrites API data. JSON-only output. Confidence scores attached. Validator catches at least 1 demonstrable hallucination.