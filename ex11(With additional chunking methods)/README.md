# Exercise 16: Multi-Strategy Chunking RAG
## Tech Stack
- Node.js (Server)
- React Frontend (Client)
- LangChain Vector Stores (ChromaDB)
- HuggingFace Embeddings

## Features
This folder is a clone of Exercise 11, extended to implement **all four chunking strategies** dynamically:
1. **Sliding Window Chunking**: Uses `SlidingWindowTextSplitter` (overlap chunking).
2. **Fixed-Size Chunking**: Uses `FixedSizeTextSplitter` (splits at exactly N characters).
3. **Semantic Chunking**: Uses `SemanticTextSplitter` (splits text naturally by paragraphs).
4. **Hierarchical Chunking**: Uses `HierarchicalTextSplitter` (preserves hierarchy tags).

The React Frontend has been updated to include a dropdown to select the desired chunking strategy before uploading the PDF.

## How to use
1. Make sure Node.js and ChromaDB are running on your system.
2. Navigate to `server`, configure the `.env` file, run `npm install`, then start the backend.
3. Navigate to `client`, run `npm install`, then start the frontend.
4. Select your preferred chunking strategy from the dropdown on the UI, then upload `sample.pdf` to test parsing and querying.
