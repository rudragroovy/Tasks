# Exercise 14: Multi-Framework Agents
## Tech Stack
- Python (LangChain, LlamaIndex, Pure SDK)

## What the Agents Do
This exercise demonstrates how to build the exact same agent using three different approaches: LangChain, LlamaIndex, and the Pure OpenAI SDK. 
All three agents share the following capabilities:
1. **Long-term Memory**: They utilize a custom `SQLiteMemory` class to store and retrieve chat history from a persistent local database, allowing them to remember past conversations across different sessions.
2. **Calculator Tool**: They are equipped with a basic mathematical function (`calculate_sum`) to perform arithmetic.
3. **Framework Comparison**: The purpose is to compare the abstraction, syntax, and execution flow of `langchain_agent.py`, `llamaindex_agent.py`, and `pure_sdk_agent.py`.

## How to use
1. Install requirements: `pip install -r requirements.txt`.
2. Set up `.env` with your `OPENROUTER_API_KEY`.
3. Run any of the agent files (e.g., `python langchain_agent.py`, `python llamaindex_agent.py`, or `python pure_sdk_agent.py`) to test their conversational memory and tool usage.
