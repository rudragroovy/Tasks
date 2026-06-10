# Exercise 11: Advanced PDF Parser and RAG
## Tech Stack
- Node.js (Server)
- Frontend Framework (Client)
- LangChain Vector Stores (ChromaDB)
- HuggingFace Embeddings

## Changes from Exercise 10
This exercise is an advanced iteration of Exercise 10, introducing several key improvements:
1. **Semantic Search with Vector Store**: Instead of retrieving hardcoded pages or naive text, it integrates **ChromaDB** and **HuggingFaceInferenceEmbeddings** to embed the document and retrieve the top 3 most semantically relevant chunks.
2. **Advanced Chunking**: Implements a `RecursiveCharacterTextSplitter` to break down large texts into smaller overlapping chunks (1000 size, 200 overlap), preventing context window limits and improving retrieval accuracy.
3. **Streaming Responses**: Upgrades the chat controller to use Server-Sent Events (SSE) streaming (`stream: true`). The frontend now receives the AI's response token-by-token in real time, drastically improving the perceived latency.

## System Dependencies
- **Node.js**: Required to install packages (`npm install`) and run the client/server without errors.
- **ChromaDB**: Required to be running locally on port 8000 (or as configured in `.env`).
- **Environment Variables**: An `OPENAI_API_KEY` (or equivalent OpenRouter key) and a `HUGGINGFACE_API_KEY` must be configured in the `.env` file of the server directory to generate embeddings and run AI features without errors.

## How to use
1. Make sure Node.js and ChromaDB are running on your system.
2. Navigate to `server`, configure the `.env` file, run `npm install`, then start the backend.
3. Navigate to `client`, run `npm install`, then start the frontend.
4. Upload `sample.pdf` to test parsing functionality and ask queries in the chat panel.
