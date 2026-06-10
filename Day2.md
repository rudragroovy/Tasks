### Task 3 – Prompt Engineering Bootcamp

**What We Built**

* Rewrote 10 bad prompts into effective prompts.
* Compared 5 prompting techniques.
* Created a few-shot prompt exercise.
* Built a reusable prompt library with 10 templates.

**One Thing We Learned**

* Prompt structure and wording greatly impact LLM response quality.

---

### Task 4 – Claude Projects & Multi-LLM Comparison

**What We Built**

* Created 3 Claude Projects: Frontend Developer, Backend Developer, and Code Reviewer.
* Configured custom system prompts and pinned reference files.
* Compared responses from ChatGPT, Claude, and Gemini.
* Documented strengths, weaknesses, and recommendations for each model.

**What We Struggled With**

* Designing effective system prompts.

**One Thing We Learned**

* Specialized prompts and contextual files significantly improve AI performance and consistency.

---

### Task 5 – Student Management CRUD Application

**What We Built**

* Developed a full-stack Student Management system using React, Node.js, and PostgreSQL.
* Implemented a responsive Glassmorphic UI with a Bento-Box dashboard.
* Added bulk CSV import and dynamic course/student management.

**One Thing We Learned**

* Combining strong backend validation with user-friendly frontend feedback creates a better user experience.

---

### Task 6 – Basic Chat CLI Integration

**What We Built**

* Developed a simple Python CLI (`test.py`) that interacts with the OpenRouter API.
* Implemented persistent chat history logging (`history.json`) and `/clear` functionality.
* Loaded environment variables using `.env` files to manage API keys securely.

**One Thing We Learned**

* Storing conversation history locally is crucial for maintaining context in a multi-turn chat interaction with the API.

---

### Task 7 – Multi-Provider CLI & Benchmarking

**What We Built**

* Refactored the CLI to support a `--provider` flag (OpenAI, Gemini, Anthropic).
* Built a `benchmark.py` script that evaluates 5 different prompts across 3 separate LLMs.
* Compiled a cost table and decision matrix analyzing input/output token expenses.

**One Thing We Learned**

* Different models vary vastly in verbosity and cost. 
* Used Openrouter Free Api for running and testing 

---

### Task 8 – Production-grade Async CLI (v2)

**What We Built**

* Transformed the script into an object-oriented `ProductionBot` utilizing Python's `asyncio`.
* Implemented real-time response streaming using the `AsyncOpenAI` client.
* Added exponential backoff and retry mechanisms using `tenacity` to handle rate limits (429) gracefully.
* Integrated local token estimation using `tiktoken` to monitor usage live.

**One Thing We Learned**

* Streaming API responses prevents the CLI from feeling frozen during long generations, vastly improving the user experience.

---

### Task 9 – Prompt Caching & Codebase Explainer (v3)

**What We Built**

* Upgraded the CLI to support logging every interaction to a persistent CSV (`dashboard.csv`).
* Extracted and visualized `cached_tokens` usage directly from the OpenRouter API usage payload.
* Created an `explain_codebase.py` tool that recursively ingests an entire repository (up to a 10K token ceiling) and activates prompt caching for cost-effective codebase querying.

**One Thing We Learned**

* Sending a massive system prompt repeatedly triggers automatic prompt caching, which drastically reduces input token costs for consecutive queries against the same codebase.
