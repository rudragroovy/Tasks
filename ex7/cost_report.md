# Multi-Provider Cost Report & Decision Matrix

This report details the evaluation of running 5 diverse prompts across three models: **GPT-4o-mini**, **Gemini 2.5 Flash**, and **Claude 3 Haiku** using the OpenRouter API.

## Token Usage & Cost Table

Below is the aggregated token usage from our benchmark. Costs are calculated based on current pricing per 1 million tokens.

| Provider | Model | Total Input Tokens | Total Output Tokens | Input Cost (per 1M) | Output Cost (per 1M) | Total Cost for 5 Prompts |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenAI** | `gpt-4o-mini` | 101 | 406 | $0.150 | $0.600 | **$0.000258** |
| **Google** | `gemini-2.5-flash`| 69 | 767 | $0.075 | $0.300 | **$0.000235** |
| **Anthropic**| `claude-3-haiku` | 108 | 866 | $0.250 | $1.250 | **$0.001109** |

*Note: Pricing is approximate and reflects base API pricing.*

### Observations:
- **Gemini 2.5 Flash** proved to be the most cost-effective and highly verbose model, producing a significant amount of output while remaining the cheapest.
- **Claude 3 Haiku** produced the most output tokens overall (866) but was relatively the most expensive of the fast models.
- **GPT-4o-mini** hit a sweet spot with concise, highly accurate outputs and very low cost.

---

## Decision Matrix: When to choose which model?

> [!TIP]
> Choosing the right model depends on your priorities: speed, cost, context size, or formatting consistency.

| Scenario / Priority | Recommended Model | Why? |
| :--- | :--- | :--- |
| **Maximum Cost Efficiency** | **Gemini 2.5 Flash** | Offers the lowest price per million tokens, making it ideal for high-volume tasks, large document processing, or repetitive data extraction. |
| **Large Context Windows** | **Gemini 2.5 Flash** | Inherits a massive context window (up to 1M+ tokens), making it the only choice in this tier for dropping entire codebases or books into the prompt. |
| **Consistently Structured Output** | **GPT-4o-mini** | OpenAI models are heavily fine-tuned for following strict JSON schemas and system prompts, making it great for code generation and API pipelines. |
| **Speed and Human-like Tone** | **Claude 3 Haiku** | Extremely fast time-to-first-token. Claude models also tend to write with a more natural, less "AI-sounding" tone, great for drafting emails or creative text. |
| **General Purpose / Balance** | **GPT-4o-mini** | The best balance of high reasoning capability (closer to GPT-4), low cost, and concise responses. |

> [!IMPORTANT]
> If you start processing huge batches, remember that OpenRouter imposes default context limits (e.g., reserving 65k tokens) which can quickly drain your account credits if you don't explicitly cap `max_tokens` in your API calls!
