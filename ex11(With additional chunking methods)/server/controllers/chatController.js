const { OpenAI } = require('openai');
const activeDocuments = require('../models/activeDocuments');
require('dotenv').config();

// Configure OpenAI client for OpenRouter
const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY
});

// Helper: Search and score pages based on query term overlap (Simple TF)
function getRelevantPages(pages, query, topK = 15) {
    const stopWords = new Set(["the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "to", "of", "in", "for", "on", "with", "as", "at", "by", "an", "this", "that", "it", "you", "he", "she", "they", "we", "us", "i", "how", "what", "why", "where", "when", "who", "which", "whose", "whom", "my", "your"]);
    const queryTerms = query.toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(term => term.length > 2 && !stopWords.has(term));

    if (queryTerms.length === 0) {
        return pages.slice(0, topK);
    }

    const scoredPages = pages.map(p => {
        let score = 0;
        const pageTextLower = p.text.toLowerCase();
        
        queryTerms.forEach(term => {
            const termRegex = new RegExp(`\\b${term}\\b`, "g");
            const matches = pageTextLower.match(termRegex);
            if (matches) {
                score += matches.length * 2.0;
            } else if (pageTextLower.includes(term)) {
                score += 0.5;
            }
        });
        
        return { page: p.page, text: p.text, score };
    });

    scoredPages.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.page - b.page;
    });

    let selected = scoredPages.slice(0, topK).filter(p => p.score > 0 || scoredPages.length <= topK);
    
    if (selected.length === 0) {
        selected = scoredPages.slice(0, topK);
    }

    return selected.sort((a, b) => a.page - b.page);
}

// Endpoint controller: Chat Q&A
async function handleChat(req, res) {
    try {
        const { docId, messages } = req.body;
        if (!docId || !messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "Missing required parameters (docId, messages)" });
        }

        const doc = activeDocuments.get(docId);
        if (!doc) {
            return res.status(404).json({ error: "Document not found or expired. Please re-upload." });
        }

        const latestUserMsg = messages[messages.length - 1];
        if (latestUserMsg.role !== 'user') {
            return res.status(400).json({ error: "Latest message must be from user" });
        }
        
        const question = latestUserMsg.content;

        const totalChars = doc.pages.reduce((acc, p) => acc + p.text.length, 0);
        const approxTokens = totalChars / 4;
        
        let usedRetrieval = "vector_search";
        let contextText = "";
        let retrievedPages = [];
        
        if (doc.vectorStore) {
            // Retrieve top 3 semantically relevant chunks using Chroma
            const results = await doc.vectorStore.similaritySearch(question, 3);
            
            console.log("=== RETRIEVED CHUNKS ===");
            results.forEach((res, idx) => {
                console.log(`[Chunk ${idx + 1} - Score: ${res.score?.toFixed(4)}] Page ${res.metadata.page}:`);
                console.log(res.pageContent.substring(0, 150) + "...\n");
            });
            console.log("========================");

            contextText = results.map((res, idx) => `=== PAGE ${res.metadata.page} ===\n${res.pageContent}`).join('\n\n');
            retrievedPages = [...new Set(results.map(r => r.metadata.page))].sort((a,b) => a - b);
        } else {
            // Fallback for older documents missing vector store
            const selectedPages = doc.pages;
            contextText = selectedPages.map(p => `=== PAGE ${p.page} ===\n${p.text}`).join('\n\n');
            retrievedPages = selectedPages.map(p => p.page);
            usedRetrieval = "fallback_all";
        }

        const systemPrompt = `You are a helpful and precise Smart Document Q&A assistant.
Your task is to answer the user's question using the provided context from the uploaded PDF document.

CRITICAL RULES:
1. You MUST cite the page number(s) in square brackets when referencing information (e.g. "[Page X]" or "[Page X, Page Y]").
2. Only base your answers on the provided context. If the information is not in the context, state: "I cannot find this information in the document." Do not try to make up or hallucinate any facts.
3. Keep answers clear, structured, and easy to read.`;

        const apiMessages = [
            { role: "system", content: systemPrompt }
        ];

        for (let i = 0; i < messages.length - 1; i++) {
            apiMessages.push(messages[i]);
        }

        const promptWithContext = `Use the following document pages context to answer the question.

DOCUMENT CONTEXT:
-----------------
${contextText}
-----------------

QUESTION:
${question}`;

        apiMessages.push({
            role: "user",
            content: promptWithContext
        });

        const startTime = Date.now();
        console.log(`Sending query for document "${doc.filename}" to OpenRouter (streaming)...`);

        const stream = await openai.chat.completions.create({
            model: process.env.OPENROUTER_DEFAULT_MODEL || "openrouter/free",
            messages: apiMessages,
            temperature: 0.2,
            max_tokens: 1500,
            stream: true
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        res.write(`data: ${JSON.stringify({ type: 'context', source_context: contextText, pages_included: retrievedPages, retrieval_method: usedRetrieval })}\n\n`);

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
                res.write(`data: ${JSON.stringify({ type: 'token', content: content })}\n\n`);
            }
        }

        const latencyMs = Date.now() - startTime;
        res.write(`data: ${JSON.stringify({ type: 'done', latency_ms: latencyMs, model: process.env.OPENROUTER_DEFAULT_MODEL || "openrouter/free" })}\n\n`);
        res.end();

    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ error: "Failed to query the AI assistant: " + error.message });
    }
}

module.exports = {
    getRelevantPages,
    handleChat
};
