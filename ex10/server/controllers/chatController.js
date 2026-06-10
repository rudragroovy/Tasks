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
        
        let selectedPages = [];
        let usedRetrieval = "all";
        
        if (approxTokens < 60000) {
            selectedPages = doc.pages;
        } else {
            selectedPages = getRelevantPages(doc.pages, question, 15);
            usedRetrieval = "retrieved";
        }

        let contextText = selectedPages.map(p => `=== PAGE ${p.page} ===\n${p.text}`).join('\n\n');

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
        console.log(`Sending query for document "${doc.filename}" to OpenRouter...`);

        const completion = await openai.chat.completions.create({
            model: process.env.OPENROUTER_DEFAULT_MODEL || "openrouter/free",
            messages: apiMessages,
            temperature: 0.2,
            max_tokens: 1500
        });

        const latencyMs = Date.now() - startTime;
        const answer = completion.choices[0].message.content;
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const responseModel = process.env.OPENROUTER_DEFAULT_MODEL || "openrouter/free";

        // Dynamic Pricing Mapping (Cost per Million Tokens)
        const MODEL_COSTS = {
            "openrouter/free": { input: 0.0, output: 0.0 },
            "anthropic/claude-3-haiku": { input: 0.25, output: 1.25 },
            "anthropic/claude-3-sonnet": { input: 3.0, output: 15.0 },
            "google/gemini-flash-1.5": { input: 0.35, output: 1.05 }
        };

        const pricing = MODEL_COSTS[responseModel] || { input: 0.0, output: 0.0 };
        const queryCost = ((usage.prompt_tokens * pricing.input) + (usage.completion_tokens * pricing.output)) / 1000000;

        console.log(`Received completion from OpenRouter. Prompt tokens: ${usage.prompt_tokens}, Completion tokens: ${usage.completion_tokens}. Latency: ${latencyMs}ms. Cost: $${queryCost}`);

        res.json({
            answer,
            usage: {
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.total_tokens,
                latency_ms: latencyMs,
                model: responseModel,
                cost: queryCost,
                retrieval_method: usedRetrieval,
                pages_included: selectedPages.map(p => p.page)
            }
        });

    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ error: "Failed to query the AI assistant: " + error.message });
    }
}

module.exports = {
    getRelevantPages,
    handleChat
};
