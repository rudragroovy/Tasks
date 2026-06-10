# Exercise 8: Production-grade Async CLI (v2)
## Tech Stack
- Python (asyncio)

## Dependencies Breakdown
- **openai**: Used to interact with the OpenRouter/OpenAI API.
- **tiktoken**: Used for local, fast token counting and estimation.
- **tenacity**: Used to implement exponential backoff and retries, gracefully handling rate limits.
- **python-dotenv**: Used to load environment variables securely from the `.env` file.
- **colorama**: Used for adding color and formatting to terminal text outputs.

## How to use
1. Configure `.env` with your API keys.
2. Install requirements: `pip install -r requirements.txt`.
3. Run `python bot_v2.py`.
