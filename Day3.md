# Day 3 Summary (Tasks 10 - 15)

This document summarizes the implementations and learnings from Tasks 10 through 15, focusing heavily on RAG (Retrieval-Augmented Generation), Chunking Strategies, and AI Agent development.

---

### Task 10 – PDF Parser and Basic RAG
**What We Built**
* Developed a full-stack RAG application with a Node.js Express backend and a React frontend.
* Implemented basic PDF parsing using `pdf-parse` to extract text from uploaded documents.
* Built an endpoint to query the OpenRouter API, passing the entire parsed document as context for question-answering.

---

### Task 11 – Advanced PDF Parser with Vector Store & Streaming
**What We Built**
* Upgraded the Task 10 RAG application with a robust Vector Store backend.
* Integrated **ChromaDB** and **HuggingFace Embeddings** to enable semantic similarity search, allowing the app to only retrieve the top 3 most relevant text chunks instead of the entire document.
* Implemented a custom `RecursiveCharacterTextSplitter` to handle document chunking intelligently (chunk size: 1000, overlap: 200).
* Replaced synchronous API calls with **Server-Sent Events (SSE)** to stream the LLM's response token-by-token back to the React UI in real time.

---

### Task 12 – Text Chunking Strategies
**What We Built**
* Explored and documented various text chunking techniques for LLM retrieval in `chunking_types.md`.
* Analyzed the tradeoffs between naive splitting, character-level recursive splitting, and semantic chunking.

---

### Task 13 – ReAct Agent with LangGraph & Langchain
**What We Built**
* Developed an autonomous ReAct (Reasoning + Acting) Agent using LangGraph.
* Implemented `MemorySaver` to provide the agent with continuous conversational memory.
* Equipped the agent with three distinct tools:
  1. **Calculator Tools**: Basic math operations.
  2. **Web Search**: DuckDuckGo integration for real-time internet browsing.
  3. **Slack Webhook**: Ability to autonomously send messages to a Slack channel.

---

### Task 14 – Multi-Framework Agent Comparison
**What We Built**
* Built the exact same agent functionality using three distinct approaches: **LangChain**, **LlamaIndex**, and the **Pure OpenAI SDK**.
* Connected all three agents to a custom `SQLiteMemory` class to provide persistent, long-term chat history across different terminal sessions.
* Compared the abstraction levels, syntax, and execution flows between the frameworks to better understand their underlying mechanics.

---

### Task 15 – Automated Candidate Screener Agent
**What We Built**
* Developed an AI agent that acts as an automated technical recruiter.
* Provided the agent with tools to read files (`.txt` and `.pdf`) using `PyPDF2` to process resumes and job descriptions.
* Instructed the agent to autonomously evaluate the resume against the job requirements, score the candidate out of 10, and provide structured feedback.
* Integrated a `save_to_db` tool that allows the agent to save the candidate's scorecard directly into a local SQLite database (`candidates.db`) for future review.
