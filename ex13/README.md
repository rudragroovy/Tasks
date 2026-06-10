# Exercise 13: Python Agent
## Tech Stack
- Python (LangGraph, Langchain)

## What the Agent Does
This project implements a ReAct (Reasoning + Acting) Agent using LangGraph and Langchain that maintains conversational memory. The agent is equipped with the following capabilities (tools) which it can autonomously choose to use to fulfill user requests:
1. **Calculator Tools**: Can perform math operations (Add, Subtract, Multiply, Divide).
2. **Web Search**: Uses the DuckDuckGo Search API to browse the internet for up-to-date information.
3. **Slack Integration**: Can send messages directly to a specified Slack channel via a Webhook URL.

## How to use
1. Install requirements: `pip install -r requirements.txt`.
2. Configure `.env` with `OPENROUTER_API_KEY` and `SLACK_WEBHOOK_URL`.
3. Run `python agent.py` to execute the agent. Run `pytest test_agent.py` for tests.
