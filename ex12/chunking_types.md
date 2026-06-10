# Chunking Comparison Report

## Objective

The goal of this experiment was to compare different chunking strategies for Retrieval-Augmented Generation (RAG) systems and evaluate their impact on retrieval quality, context preservation, and answer accuracy.

---

## 1. Fixed-Size Chunking

### Description

The document is divided into chunks containing a fixed number of characters or tokens (e.g., 500 tokens per chunk).

### Advantages

* Simple to implement.
* Fast preprocessing.
* Consistent chunk sizes.

### Disadvantages

* May split sentences or paragraphs.
* Context can be lost at chunk boundaries.
* Lower semantic coherence.

### Retrieval Quality

Moderate. Works well for structured documents but may miss complete ideas.

---

## 2. Semantic Chunking

### Description

Chunks are created based on semantic boundaries such as paragraphs, topics, or sentence similarity instead of fixed lengths.

### Advantages

* Preserves natural meaning.
* Improves retrieval relevance.
* Better context for language models.

### Disadvantages

* More computationally expensive.
* Requires semantic analysis or embedding-based splitting.

### Retrieval Quality

High. Produces more meaningful and accurate retrieval results.

---

## 3. Sliding Window Chunking

### Description

Chunks overlap with neighboring chunks (e.g., 500 tokens with 100-token overlap) to preserve context across boundaries.

### Advantages

* Reduces information loss.
* Maintains continuity between chunks.
* Better for documents with cross-references.

### Disadvantages

* Increases storage requirements.
* Duplicate information may be retrieved.

### Retrieval Quality

Very High. Overlapping context improves answer completeness.

---

## 4. Hierarchical Chunking

### Description

Documents are split into multiple levels, such as chapters → sections → paragraphs, enabling retrieval at different granularities.

### Advantages

* Maintains document structure.
* Supports coarse and fine-grained retrieval.
* Effective for long technical documents.

### Disadvantages

* More complex implementation.
* Additional indexing overhead.

### Retrieval Quality

Excellent for large structured documents but requires careful design.

---

# Retrieval Quality Comparison

| Strategy       | Context Preservation | Retrieval Accuracy | Storage Cost | Implementation Complexity |
| -------------- | -------------------- | ------------------ | ------------ | ------------------------- |
| Fixed-Size     | Low                  | Moderate           | Low          | Easy                      |
| Semantic       | High                 | High               | Medium       | Medium                    |
| Sliding Window | Very High            | Very High          | High         | Medium                    |
| Hierarchical   | Excellent            | Excellent          | Medium       | High                      |

---

# Cohere Reranker (Second-Pass Retrieval)

## What It Does

A reranker takes the initially retrieved documents and scores them again using a cross-encoder model to improve ranking quality.

### Retrieval Pipeline

1. User submits a query.
2. Vector database retrieves the top K similar chunks.
3. Cohere Reranker evaluates query–document pairs.
4. Chunks are reordered based on semantic relevance.
5. The highest-ranked chunks are sent to the LLM.

### Benefits

* Improves retrieval precision.
* Reduces irrelevant context.
* Produces better final answers.
* Particularly useful when vector similarity alone is insufficient.

### Drawbacks

* Adds extra latency.
* Increases inference cost.
* Requires an additional API call or model execution.

---

# Experimental Observations

* Fixed-size chunking was fast but occasionally split important information.
* Semantic chunking produced more coherent and relevant retrieval results.
* Sliding window chunking handled boundary cases effectively and consistently improved recall.
* Hierarchical chunking performed best on long structured documents but required additional preprocessing.
* Applying a reranker after vector retrieval noticeably improved the relevance of the final retrieved chunks.

---

# Conclusion

Among the tested approaches, sliding window and hierarchical chunking provided the best retrieval performance by preserving context and improving answer quality. Semantic chunking offered an excellent balance between simplicity and effectiveness, while fixed-size chunking was suitable for basic applications where speed and ease of implementation are priorities. Using a second-pass reranker further enhanced retrieval accuracy by selecting the most relevant chunks before passing them to the language model, making it a valuable addition to production RAG systems.
